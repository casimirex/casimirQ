/**
 * Tests for SimulationRunnerService
 *
 * Verifies that a JSON circuit spec is built and executed on the real
 * simulation engines, producing correct statevector / probabilities / counts.
 */

import { BadRequestException } from '@nestjs/common';
import { SimulationRunnerService } from '../simulation-runner.service';
import { SimulationEnginesService } from '../../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../../simulation-engines/engines/clifford-engine/clifford-engine';

describe('SimulationRunnerService', () => {
  let runner: SimulationRunnerService;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    runner = new SimulationRunnerService(engines);
  });

  describe('Bell state', () => {
    const bell = {
      numQubits: 2,
      operations: [
        { gate: 'h', targets: [0] },
        { gate: 'cnot', targets: [0, 1] },
      ],
    };

    it('produces a maximally-entangled statevector (|00> and |11> only)', () => {
      const out = runner.run(bell, { shots: 0 });

      expect(out.status).toBe('completed');
      expect(out.numQubits).toBe(2);

      const probs = out.results.probabilities;
      expect(Object.keys(probs).sort()).toEqual(['00', '11']);
      expect(probs['00']).toBeCloseTo(0.5, 6);
      expect(probs['11']).toBeCloseTo(0.5, 6);
    });

    it('samples measurement counts that sum to the shot count', () => {
      const out = runner.run(bell, { shots: 2000, seed: 42 });

      const counts = out.results.counts;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(2000);
      // Only the two Bell outcomes should appear.
      expect(Object.keys(counts).sort()).toEqual(['00', '11']);
    });

    it('is deterministic for a fixed seed', () => {
      const a = runner.run(bell, { shots: 500, seed: 7 });
      const b = runner.run(bell, { shots: 500, seed: 7 });
      expect(a.results.counts).toEqual(b.results.counts);
    });

    it('defaults to the statevector engine for exact amplitudes', () => {
      const out = runner.run(bell, { shots: 0 });
      expect(out.requestedEngine).toBe('statevector');
    });

    it('honors an explicitly requested engine', () => {
      const out = runner.run(bell, { engine: 'statevector', shots: 0 });
      expect(out.requestedEngine).toBe('statevector');
      expect(Object.keys(out.results.probabilities).sort()).toEqual(['00', '11']);
    });
  });

  describe('single-qubit gates', () => {
    it('X gate flips |0> to |1>', () => {
      const out = runner.run(
        { numQubits: 1, operations: [{ gate: 'x', targets: [0] }] },
        { shots: 0 },
      );
      expect(out.results.probabilities['1']).toBeCloseTo(1, 6);
      expect(out.results.probabilities['0']).toBeUndefined();
    });

    it('applies parameterized rotations (rx pi -> |1>)', () => {
      const out = runner.run(
        { numQubits: 1, operations: [{ gate: 'rx', targets: [0], params: [Math.PI] }] },
        { shots: 0 },
      );
      expect(out.results.probabilities['1']).toBeCloseTo(1, 6);
    });
  });

  describe('validation', () => {
    it('rejects a missing/invalid numQubits', () => {
      expect(() => runner.run({ numQubits: 0 })).toThrow(BadRequestException);
      expect(() => runner.run({ numQubits: undefined as unknown as number })).toThrow(
        BadRequestException,
      );
    });

    it('rejects an unknown gate', () => {
      expect(() =>
        runner.run({ numQubits: 1, operations: [{ gate: 'bogus', targets: [0] }] }),
      ).toThrow(BadRequestException);
    });

    it('rejects a qubit index out of range', () => {
      expect(() => runner.run({ numQubits: 2, operations: [{ gate: 'x', targets: [5] }] })).toThrow(
        BadRequestException,
      );
    });

    it('rejects too many qubits', () => {
      expect(() => runner.run({ numQubits: 100 })).toThrow(BadRequestException);
    });
  });

  describe('multi-controlled gates', () => {
    // Controls are folded into targets: [...controls, target].
    it('mcx flips the target only when all controls are set', () => {
      // 3 controls all set -> target flips.
      const set = runner.run(
        {
          numQubits: 4,
          operations: [
            { gate: 'x', targets: [0] },
            { gate: 'x', targets: [1] },
            { gate: 'x', targets: [2] },
            { gate: 'mcx', targets: [0, 1, 2, 3] },
          ],
        },
        { shots: 0 },
      ).results.probabilities;
      expect(set['1111']).toBeCloseTo(1, 6);

      // One control unset -> no flip.
      const unset = runner.run(
        {
          numQubits: 4,
          operations: [
            { gate: 'x', targets: [0] },
            { gate: 'x', targets: [1] },
            { gate: 'mcx', targets: [0, 1, 2, 3] },
          ],
        },
        { shots: 0 },
      ).results.probabilities;
      expect(unset['0011']).toBeCloseTo(1, 6); // q0=1,q1=1,q2=0,q3=0
    });

    it('ccz (alias of a 2-control mcz) negates only the all-ones amplitude', () => {
      const sv = runner.run(
        {
          numQubits: 3,
          operations: [
            { gate: 'h', targets: [0] },
            { gate: 'h', targets: [1] },
            { gate: 'h', targets: [2] },
            { gate: 'ccz', targets: [0, 1, 2] },
          ],
        },
        { shots: 0 },
      ).results.statevector;

      const amp = Object.fromEntries(sv.map((a) => [a.state, a.re]));
      const inv = 1 / Math.sqrt(8);
      expect(amp['111']).toBeCloseTo(-inv, 6); // phase-flipped
      expect(amp['000']).toBeCloseTo(inv, 6); // untouched
    });

    it('mcz matches the phase of ccz for two controls', () => {
      const run = (gate: string) =>
        runner.run(
          {
            numQubits: 3,
            operations: [
              { gate: 'h', targets: [0] },
              { gate: 'h', targets: [1] },
              { gate: 'h', targets: [2] },
              { gate, targets: [0, 1, 2] },
            ],
          },
          { shots: 0 },
        ).results.statevector;
      const amp = (sv: { state: string; re: number }[], s: string) =>
        sv.find((a) => a.state === s)!.re;
      expect(amp(run('mcz'), '111')).toBeCloseTo(amp(run('ccz'), '111'), 6);
    });

    it('rejects a multi-controlled gate without a control', () => {
      expect(() =>
        runner.run({ numQubits: 1, operations: [{ gate: 'mcx', targets: [0] }] }),
      ).toThrow(BadRequestException);
    });
  });
});
