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
});
