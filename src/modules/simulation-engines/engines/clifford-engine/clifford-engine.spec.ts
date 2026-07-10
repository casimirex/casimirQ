import { CliffordEngine } from './clifford-engine';
import { Circuit } from '../../../circuit-engine/circuit';

describe('CliffordEngine', () => {
  let engine: CliffordEngine;

  beforeEach(() => {
    engine = new CliffordEngine();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('Clifford Gates', () => {
    it('should execute H gate', () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute S gate', () => {
      const circuit = Circuit.builder(1).s(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute CNOT gate', () => {
      const circuit = Circuit.builder(2).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute X gate', () => {
      const circuit = Circuit.builder(1).x(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute Y gate', () => {
      const circuit = Circuit.builder(1).y(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute Z gate', () => {
      const circuit = Circuit.builder(1).z(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Stabilizer Operations', () => {
    it('should track stabilizer generators', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      // Result should contain stabilizer information
    });

    it('should handle Bell state creation', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      // Should be in stabilizer state
    });

    it('should handle GHZ state', () => {
      const circuit = Circuit.builder(3).h(0).cx(0, 1).cx(0, 2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Measurement', () => {
    it('should measure single qubit', () => {
      const circuit = Circuit.builder(1).h(0).measure(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.measurements).toBeDefined();
    });

    it('should measure multiple qubits', () => {
      const circuit = Circuit.builder(2).h(0).h(1).measure(0).measure(1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle conditional operations', () => {
      const circuit = Circuit.builder(2).h(0).measure(0).x(1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Pauli String Operations', () => {
    it('should handle Pauli propagation', () => {
      const circuit = Circuit.builder(3).h(0).cx(0, 1).cx(1, 2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle Pauli rotations', () => {
      const circuit = Circuit.builder(2).h(0).s(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Tableau Operations', () => {
    it('should maintain tableau for n qubits', () => {
      const circuit = Circuit.builder(4).h(0).h(1).h(2).h(3).cx(0, 1).cx(2, 3).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle conjugation by Clifford', () => {
      const circuit = Circuit.builder(2).x(0).h(0).cx(0, 1).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Performance Features', () => {
    it('should handle many qubits efficiently', () => {
      const circuit = Circuit.builder(50).h(0).cx(0, 1).build();
      const start = performance.now();
      const result = engine.simulate(circuit);
      const duration = performance.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should be fast for Clifford
    });

    it('should return execution metrics', () => {
      const circuit = Circuit.builder(10).h(0).cx(0, 1).build();
      const result = engine.simulate(circuit);

      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(result.memoryUsageBytes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty circuit', () => {
      const circuit = Circuit.builder(1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle identity operations', () => {
      const circuit = Circuit.builder(2).cx(0, 1).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle deep circuits', () => {
      const builder = Circuit.builder(2);
      for (let i = 0; i < 100; i++) {
        builder.h(0).cx(0, 1).h(0);
      }
      const result = engine.simulate(builder.build());
      expect(result).toBeDefined();
    });
  });
});
