/**
 * Transpiler tests.
 *
 * The core guarantee is *equivalence*: a transpiled circuit must produce the
 * same measurement distribution as the original. Each case transpiles a circuit,
 * checks it is in the native basis, and compares statevector probabilities
 * against the original — so any wrong decomposition is caught numerically.
 */

import { TranspilerService, NATIVE_BASIS } from '../transpiler.service';
import {
  SimulationRunnerService,
  CircuitOperationSpec,
} from '../../api/services/simulation-runner.service';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../simulation-engines/engines/clifford-engine/clifford-engine';

describe('TranspilerService', () => {
  let runner: SimulationRunnerService;
  let transpiler: TranspilerService;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    runner = new SimulationRunnerService(engines);
    transpiler = new TranspilerService(runner);
  });

  function probabilities(
    numQubits: number,
    operations: CircuitOperationSpec[],
  ): Record<string, number> {
    return runner.run({ numQubits, operations }, { engine: 'statevector', shots: 1 }).results
      .probabilities;
  }

  /** Full complex statevector, as a state -> {re, im} map. */
  function amplitudes(
    numQubits: number,
    operations: CircuitOperationSpec[],
  ): Record<string, { re: number; im: number }> {
    const sv = runner.run({ numQubits, operations }, { engine: 'statevector', shots: 1 }).results
      .statevector;
    const map: Record<string, { re: number; im: number }> = {};
    for (const a of sv) map[a.state] = { re: a.re, im: a.im };
    return map;
  }

  /** Assert the transpiled circuit measures identically to the original. */
  function assertEquivalent(numQubits: number, operations: CircuitOperationSpec[]) {
    const result = transpiler.transpile({ numQubits, operations });
    const before = probabilities(numQubits, operations);
    const after = probabilities(numQubits, result.operations);
    const states = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const s of states) {
      expect(after[s] ?? 0).toBeCloseTo(before[s] ?? 0, 6);
    }
    return result;
  }

  /**
   * Stronger than `assertEquivalent`: compares full complex amplitudes via state
   * fidelity |⟨before|after⟩|, which is 1 iff the states are equal up to an
   * (invisible) global phase. Unlike a probability check this catches *relative*
   * phase errors — the kind a controlled-phase decomposition can introduce.
   */
  function assertStatevectorEquivalent(numQubits: number, operations: CircuitOperationSpec[]) {
    const result = transpiler.transpile({ numQubits, operations });
    const before = amplitudes(numQubits, operations);
    const after = amplitudes(numQubits, result.operations);
    const states = new Set([...Object.keys(before), ...Object.keys(after)]);
    let re = 0;
    let im = 0;
    for (const s of states) {
      const b = before[s] ?? { re: 0, im: 0 };
      const a = after[s] ?? { re: 0, im: 0 };
      // ⟨before|after⟩ = Σ conj(b)·a
      re += b.re * a.re + b.im * a.im;
      im += b.re * a.im - b.im * a.re;
    }
    const fidelity = Math.hypot(re, im);
    expect(fidelity).toBeCloseTo(1, 6);
    return result;
  }

  function isNative(result: { operations: CircuitOperationSpec[] }): boolean {
    return result.operations.every((op) => NATIVE_BASIS.includes(op.gate));
  }

  it('transpiles a Bell state to native gates, preserving the distribution', () => {
    const result = assertEquivalent(2, [
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] },
    ]);
    expect(result.fullyNative).toBe(true);
    expect(isNative(result)).toBe(true);
    expect(result.unsupported).toEqual([]);
  });

  it('decomposes every single-qubit gate correctly (via H·G·H)', () => {
    // Sandwiching in Hadamards turns hidden phases into measurable probabilities,
    // so this catches phase errors in the ZYZ decomposition.
    for (const gate of ['x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg']) {
      const result = assertEquivalent(1, [
        { gate: 'h', targets: [0] },
        { gate, targets: [0] },
        { gate: 'h', targets: [0] },
      ]);
      expect(isNative(result)).toBe(true);
    }
  });

  it('decomposes rotations', () => {
    assertEquivalent(1, [{ gate: 'rx', targets: [0], params: [0.7] }]);
    assertEquivalent(1, [{ gate: 'ry', targets: [0], params: [1.1] }]);
    assertEquivalent(1, [
      { gate: 'h', targets: [0] },
      { gate: 'rz', targets: [0], params: [0.9] },
      { gate: 'h', targets: [0] },
    ]);
  });

  it('decomposes SWAP', () => {
    const result = assertEquivalent(2, [
      { gate: 'x', targets: [0] },
      { gate: 'swap', targets: [0, 1] },
    ]);
    expect(isNative(result)).toBe(true);
  });

  it('decomposes CZ', () => {
    const result = assertEquivalent(2, [
      { gate: 'h', targets: [0] },
      { gate: 'h', targets: [1] },
      { gate: 'cz', targets: [0, 1] },
      { gate: 'h', targets: [1] },
    ]);
    expect(isNative(result)).toBe(true);
  });

  it('decomposes the Toffoli gate', () => {
    for (const [a, b] of [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]) {
      const prep: CircuitOperationSpec[] = [];
      if (a) prep.push({ gate: 'x', targets: [0] });
      if (b) prep.push({ gate: 'x', targets: [1] });
      const result = assertEquivalent(3, [...prep, { gate: 'ccx', targets: [0, 1, 2] }]);
      expect(isNative(result)).toBe(true);
    }
  });

  it('decomposes controlled single-qubit gates via the ABC identity', () => {
    // Put the control in superposition and the target in a phase-sensitive state,
    // so a wrong relative phase would change the full statevector. cp in
    // particular only differs from identity by a relative phase.
    const prep: CircuitOperationSpec[] = [
      { gate: 'h', targets: [0] },
      { gate: 'h', targets: [1] },
      { gate: 't', targets: [1] },
    ];
    const cases: CircuitOperationSpec[] = [
      { gate: 'cy', targets: [0, 1] },
      { gate: 'ch', targets: [0, 1] },
      { gate: 'cp', targets: [0, 1], params: [0.5] },
      { gate: 'cp', targets: [0, 1], params: [Math.PI] }, // = cz
      { gate: 'crx', targets: [0, 1], params: [0.8] },
      { gate: 'cry', targets: [0, 1], params: [1.3] },
      { gate: 'crz', targets: [0, 1], params: [1.9] },
    ];
    for (const gate of cases) {
      const result = assertStatevectorEquivalent(2, [...prep, gate]);
      expect(isNative(result)).toBe(true);
      expect(result.fullyNative).toBe(true);
    }
  });

  it('transpiles a full QFT (which needs controlled-phase) to native gates', () => {
    // A 3-qubit QFT is built from H and controlled-phase rotations — the exact
    // pattern that used to fall through as unsupported.
    const qft: CircuitOperationSpec[] = [
      { gate: 'x', targets: [0] },
      { gate: 'h', targets: [0] },
      { gate: 'cp', targets: [1, 0], params: [Math.PI / 2] },
      { gate: 'cp', targets: [2, 0], params: [Math.PI / 4] },
      { gate: 'h', targets: [1] },
      { gate: 'cp', targets: [2, 1], params: [Math.PI / 2] },
      { gate: 'h', targets: [2] },
      { gate: 'swap', targets: [0, 2] },
    ];
    const result = assertStatevectorEquivalent(3, qft);
    expect(isNative(result)).toBe(true);
    expect(result.fullyNative).toBe(true);
  });

  it('flags gates it cannot decompose but keeps the circuit runnable', () => {
    // Fredkin (controlled-SWAP) is not yet supported; it should pass through and
    // be flagged rather than silently mis-decomposed.
    const result = transpiler.transpile({
      numQubits: 3,
      operations: [
        { gate: 'h', targets: [0] },
        { gate: 'cswap', targets: [0, 1, 2] },
      ],
    });
    expect(result.fullyNative).toBe(false);
    expect(result.unsupported.length).toBeGreaterThan(0);
  });
});
