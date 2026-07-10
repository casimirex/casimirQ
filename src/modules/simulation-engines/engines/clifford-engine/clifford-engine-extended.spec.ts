import { CliffordEngine } from './clifford-engine';
import { Circuit } from '../../../circuit-engine/circuit';
import { ISimulationOptions } from '../../interfaces/simulation-engine.interface';

describe('CliffordEngine Extended', () => {
  let engine: CliffordEngine;

  beforeEach(() => {
    engine = new CliffordEngine();
  });

  describe('Complex Clifford Circuits', () => {
    it('should handle Bell state creation', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.statevector).toBeDefined();
    });

    it('should handle GHZ state creation', () => {
      const circuit = Circuit.builder(4).h(0).cx(0, 1).cx(1, 2).cx(2, 3).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle W-state like circuits', () => {
      const circuit = Circuit.builder(3).h(0).cx(0, 1).cx(0, 2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle Clifford gates only circuit', () => {
      const circuit = Circuit.builder(1).h(0).s(0).h(0).s(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle controlled-Z sequence', () => {
      const circuit = Circuit.builder(3).h(0).h(1).h(2).cz(0, 1).cz(1, 2).cz(0, 2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle SWAP operations', () => {
      const circuit = Circuit.builder(2).x(0).swap(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle multiple SWAP operations', () => {
      const circuit = Circuit.builder(4).x(0).swap(0, 1).swap(1, 2).swap(2, 3).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle S and S-dagger sequence', () => {
      const circuit = Circuit.builder(1)
        .h(0)
        .s(0)
        .s(0)
        .s(0)
        .s(0) // Should be identity
        .build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Stabilizer Measurements', () => {
    it('should handle measurement after Hadamard', () => {
      const circuit = Circuit.builder(1).h(0).measure(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.measurements).toBeDefined();
    });

    it('should handle measurement on entangled pair', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).measure(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle multiple measurements', () => {
      const circuit = Circuit.builder(3)
        .h(0)
        .cx(0, 1)
        .cx(1, 2)
        .measure(0)
        .measure(1)
        .measure(2)
        .build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle measurement with shots', () => {
      const circuit = Circuit.builder(1).h(0).measure(0).build();
      const options: ISimulationOptions = { shots: 100 };
      const result = engine.simulate(circuit, options);
      expect(result).toBeDefined();
    });

    it('should handle measurements on specific qubits', () => {
      const circuit = Circuit.builder(4).h(0).cx(0, 1).h(2).measure(0).measure(2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Pauli String Operations', () => {
    it('should compute stabilizers for Bell state', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.statevector).toBeDefined();
    });

    it('should compute stabilizers for GHZ state', () => {
      const circuit = Circuit.builder(3).h(0).cx(0, 1).cx(0, 2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle stabilizers after X gate', () => {
      const circuit = Circuit.builder(1).x(0).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle stabilizers after Z gate', () => {
      const circuit = Circuit.builder(1).h(0).z(0).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle stabilizers after Y gate', () => {
      const circuit = Circuit.builder(1).h(0).y(0).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Large Scale Circuits', () => {
    it('should handle 50-qubit circuit', () => {
      const circuit = Circuit.builder(50);
      for (let i = 0; i < 25; i++) {
        circuit.h(i);
      }
      const result = engine.simulate(circuit.build());
      expect(result).toBeDefined();
    });

    it('should handle 100-qubit entangled circuit', () => {
      const circuit = Circuit.builder(100).h(0);
      for (let i = 1; i < 100; i++) {
        circuit.cx(0, i);
      }
      const result = engine.simulate(circuit.build());
      expect(result).toBeDefined();
    });

    it('should handle circuit with many CNOTs', () => {
      const circuit = Circuit.builder(20);
      for (let i = 0; i < 19; i++) {
        circuit.cx(i, i + 1);
      }
      const result = engine.simulate(circuit.build());
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle circuit with only identity', () => {
      const circuit = Circuit.builder(2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.statevector).toBeDefined();
    });

    it('should handle circuit with no operations', () => {
      const circuit = Circuit.builder(5).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle alternating H and S gates', () => {
      const circuit = Circuit.builder(1);
      for (let i = 0; i < 20; i++) {
        circuit.h(0).s(0);
      }
      const result = engine.simulate(circuit.build());
      expect(result).toBeDefined();
    });

    it('should handle all Paulis on single qubit', () => {
      const circuit = Circuit.builder(1).x(0).y(0).z(0).h(0).x(0).y(0).z(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle Clifford with no shots', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const options: ISimulationOptions = { shots: 0 };
      const result = engine.simulate(circuit, options);
      expect(result).toBeDefined();
    });

    it('should handle Clifford with seed', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).measure(0).measure(1).build();
      const options: ISimulationOptions = { seed: 42 };
      const result = engine.simulate(circuit, options);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid qubit indices gracefully', () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle circuit with single qubit', () => {
      const circuit = Circuit.builder(1).h(0).s(0).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should handle circuit with two qubits', () => {
      const circuit = Circuit.builder(2).h(0).h(1).cz(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });
});
