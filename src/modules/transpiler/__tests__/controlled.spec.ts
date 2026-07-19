/**
 * Tests for the general multi-controlled decomposition.
 *
 * These gates (ccz, 3-controlled X, …) aren't in the API's supported gate set,
 * so they can't be fed through `transpile()`. Instead we exercise the pure
 * decomposition directly: build its native output, simulate it, and check the
 * result against the gate's definition — the same simulation-equivalence
 * discipline used elsewhere, applied to a routine that keeps the transpiler
 * total over any number of controls.
 */

import { multiControlledUOps, sqrtMatrix2 } from '../controlled';
import { Matrix2 } from '../zyz';
import {
  CircuitOperationSpec,
  SimulationRunnerService,
} from '../../api/services/simulation-runner.service';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../simulation-engines/engines/clifford-engine/clifford-engine';

const PAULI_X: Matrix2 = [
  [
    { re: 0, im: 0 },
    { re: 1, im: 0 },
  ],
  [
    { re: 1, im: 0 },
    { re: 0, im: 0 },
  ],
];
const PAULI_Z: Matrix2 = [
  [
    { re: 1, im: 0 },
    { re: 0, im: 0 },
  ],
  [
    { re: 0, im: 0 },
    { re: -1, im: 0 },
  ],
];

describe('multi-controlled decomposition', () => {
  let runner: SimulationRunnerService;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    runner = new SimulationRunnerService(engines);
  });

  function probabilities(n: number, ops: CircuitOperationSpec[]): Record<string, number> {
    return runner.run({ numQubits: n, operations: ops }, { engine: 'statevector', shots: 1 }).results
      .probabilities;
  }

  function amplitudes(n: number, ops: CircuitOperationSpec[]): Record<string, [number, number]> {
    const sv = runner.run({ numQubits: n, operations: ops }, { engine: 'statevector', shots: 1 })
      .results.statevector;
    const map: Record<string, [number, number]> = {};
    for (const a of sv) map[a.state] = [a.re, a.im];
    return map;
  }

  /** Bit for qubit `q` in the runner's `n`-qubit serialization (index n-1-q). */
  function bit(state: string, q: number, n: number): number {
    return state[n - 1 - q] === '1' ? 1 : 0;
  }

  it('sqrtMatrix2 squares back to the original (X and Z)', () => {
    for (const m of [PAULI_X, PAULI_Z]) {
      const v = sqrtMatrix2(m);
      // (v·v) should equal m.
      const p00 = v[0][0].re * v[0][0].re - v[0][0].im * v[0][0].im + (v[0][1].re * v[1][0].re - v[0][1].im * v[1][0].im);
      const p11 = v[1][0].re * v[0][1].re - v[1][0].im * v[0][1].im + (v[1][1].re * v[1][1].re - v[1][1].im * v[1][1].im);
      expect(p00).toBeCloseTo(m[0][0].re, 6);
      expect(p11).toBeCloseTo(m[1][1].re, 6);
    }
  });

  it('3-controlled X flips the target iff all three controls are set', () => {
    // Qubits 0,1,2 are controls; 3 is the target.
    for (let input = 0; input < 16; input++) {
      const prep: CircuitOperationSpec[] = [];
      for (let q = 0; q < 4; q++) if (input & (1 << q)) prep.push({ gate: 'x', targets: [q] });
      const ops = [...prep, ...multiControlledUOps([0, 1, 2], PAULI_X, 3)];

      const probs = probabilities(4, ops);
      const states = Object.keys(probs);
      // The circuit is basis-preserving, so exactly one state has probability 1.
      expect(states.length).toBe(1);
      const out = states[0];

      const controlsSet = (input & 0b0111) === 0b0111;
      const expectedTarget = controlsSet ? 1 - ((input >> 3) & 1) : (input >> 3) & 1;
      expect(bit(out, 3, 4)).toBe(expectedTarget);
      // Controls are untouched.
      for (let q = 0; q < 3; q++) expect(bit(out, q, 4)).toBe((input >> q) & 1);
    }
  });

  it('2-controlled Z matches H·CCX·H on the target (a trusted reference)', () => {
    // ccz(0,1,2) = H(2)·ccx(0,1,2)·H(2). ccx is a supported gate, so we can
    // build the reference directly and compare full statevectors.
    const prep: CircuitOperationSpec[] = [
      { gate: 'h', targets: [0] },
      { gate: 'h', targets: [1] },
      { gate: 'h', targets: [2] },
    ];
    const decomposed = [...prep, ...multiControlledUOps([0, 1], PAULI_Z, 2)];
    const reference = [
      ...prep,
      { gate: 'h', targets: [2] },
      { gate: 'ccx', targets: [0, 1, 2] },
      { gate: 'h', targets: [2] },
    ];

    const a = amplitudes(3, decomposed);
    const b = amplitudes(3, reference);
    const states = new Set([...Object.keys(a), ...Object.keys(b)]);
    // Fidelity |⟨a|b⟩| = 1 iff equal up to global phase.
    let re = 0;
    let im = 0;
    for (const s of states) {
      const [ar, ai] = a[s] ?? [0, 0];
      const [br, bi] = b[s] ?? [0, 0];
      re += ar * br + ai * bi;
      im += ar * bi - ai * br;
    }
    expect(Math.hypot(re, im)).toBeCloseTo(1, 6);
  });
});
