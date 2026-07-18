import { Circuit } from '../../../circuit-engine/circuit';
import { DensityMatrixEngine } from './density-matrix-engine';

describe('DensityMatrixEngine', () => {
  const engine = new DensityMatrixEngine();

  function bell(): Circuit {
    return Circuit.builder(2).h(0).cx(0, 1).build();
  }

  describe('noiseless evolution matches pure-state physics', () => {
    it('produces a pure, maximally-correlated Bell state', () => {
      const r = engine.simulate(bell(), { computeFidelity: true, shots: 2000 });

      // Only |00> and |11>, each ~1/2.
      expect(r.probabilities['00']).toBeCloseTo(0.5, 6);
      expect(r.probabilities['11']).toBeCloseTo(0.5, 6);
      expect(r.probabilities['01']).toBeUndefined();
      // A noiseless state is pure (Tr(ρ²) = 1) and has fidelity 1 with itself.
      expect(r.purity).toBeCloseTo(1, 6);
      expect(r.fidelity).toBeCloseTo(1, 6);
    });

    it('samples counts that sum to the shot count', () => {
      const r = engine.simulate(bell(), { shots: 500 });
      const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(500);
    });
  });

  describe('amplitude damping (T1 relaxation)', () => {
    it('drives |1> toward |0> by the damping rate', () => {
      // X prepares |1>; amplitude damping then relaxes it. P(0) should equal gamma.
      const circuit = Circuit.builder(1).x(0).build();
      for (const gamma of [0.25, 0.5, 1.0]) {
        const r = engine.simulate(circuit, {
          noise: [{ type: 'amplitude_damping', params: { gamma } }],
        });
        expect(r.probabilities['0'] ?? 0).toBeCloseTo(gamma, 6);
        expect(r.probabilities['1'] ?? 0).toBeCloseTo(1 - gamma, 6);
      }
    });
  });

  describe('bit-flip channel', () => {
    it('flips |1> to |0> with probability p', () => {
      const circuit = Circuit.builder(1).x(0).build(); // |1>
      const r = engine.simulate(circuit, {
        noise: [{ type: 'bit_flip', params: { p: 0.3 } }],
      });
      expect(r.probabilities['0'] ?? 0).toBeCloseTo(0.3, 6);
      expect(r.probabilities['1'] ?? 0).toBeCloseTo(0.7, 6);
    });
  });

  describe('depolarizing channel mixes the state', () => {
    it('reduces purity, reaching the maximally mixed state at p=1', () => {
      const circuit = Circuit.builder(1).x(0).build();

      const light = engine.simulate(circuit, {
        noise: [{ type: 'depolarizing', params: { p: 0.2 } }],
      });
      expect(light.purity).toBeLessThan(1);
      expect(light.purity).toBeGreaterThan(0.5);

      const full = engine.simulate(circuit, {
        noise: [{ type: 'depolarizing', params: { p: 1.0 } }],
      });
      // Single qubit maximally mixed: ρ = I/2, purity = 1/2, P(0)=P(1)=1/2.
      expect(full.purity).toBeCloseTo(0.5, 6);
      expect(full.probabilities['0'] ?? 0).toBeCloseTo(0.5, 6);
      expect(full.probabilities['1'] ?? 0).toBeCloseTo(0.5, 6);
    });
  });

  describe('noise lowers Bell-state fidelity', () => {
    it('reports fidelity < 1 under noise', () => {
      const r = engine.simulate(bell(), {
        noise: [{ type: 'depolarizing', params: { p: 0.1 } }],
        computeFidelity: true,
      });
      expect(r.fidelity).toBeLessThan(1);
      expect(r.fidelity).toBeGreaterThan(0);
      expect(r.purity).toBeLessThan(1);
    });
  });

  describe('guards', () => {
    it('rejects circuits beyond the qubit cap', () => {
      const small = new DensityMatrixEngine(2);
      expect(() => small.simulate(Circuit.builder(3).h(0).build())).toThrow(/supports up to/);
    });

    it('rejects out-of-range channel parameters', () => {
      expect(() =>
        engine.simulate(Circuit.builder(1).x(0).build(), {
          noise: [{ type: 'bit_flip', params: { p: 1.5 } }],
        }),
      ).toThrow(/out of range/);
    });
  });
});
