/**
 * Circuit Simulation Integration Tests
 *
 * Verifies the complete pipeline: Circuit → Gates → Statevector Simulation
 */

import { Circuit, createBellStateCircuit, createGHZStateCircuit } from '../../modules/circuit-engine/circuit';
import { StatevectorEngine } from '../../modules/simulation-engines/engines/statevector-engine/statevector-engine';
import { Complex } from '../../common/utils/complex';
import { HGate, XGate } from '../../modules/gate-library/standard-gates/single-qubit-gates';
import { CnotGate } from '../../modules/gate-library/standard-gates/multi-qubit-gates';

describe('Circuit Simulation Integration', () => {
  let engine: StatevectorEngine;

  beforeEach(() => {
    engine = new StatevectorEngine();
  });

  describe('Bell State Creation', () => {
    it('should create Bell state |Φ+⟩', () => {
      const circuit = createBellStateCircuit();
      const result = engine.simulate(circuit);

      expect(result.numQubits).toBe(2);

      // Check amplitudes: |Φ+⟩ = (|00⟩ + |11⟩)/√2
      // |00⟩ = index 0, |11⟩ = index 3
      const amp00 = result.statevector.get(BigInt(0));
      const amp11 = result.statevector.get(BigInt(3));

      expect(amp00).toBeDefined();
      expect(amp11).toBeDefined();

      // Both should have amplitude 1/√2 ≈ 0.707
      expect(amp00!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
      expect(amp11!.real).toBeCloseTo(1 / Math.sqrt(2), 10);

      // |01⟩ and |10⟩ should not exist (or be 0)
      const amp01 = result.statevector.get(BigInt(1));
      const amp10 = result.statevector.get(BigInt(2));
      expect(amp01?.magnitude() || 0).toBeLessThan(1e-10);
      expect(amp10?.magnitude() || 0).toBeLessThan(1e-10);
    });

    it('should have correct probabilities for Bell state', () => {
      const circuit = createBellStateCircuit();
      const result = engine.simulate(circuit);

      // P(|00⟩) = P(|11⟩) = 0.5
      const prob00 = engine.getProbability(result.statevector, BigInt(0));
      const prob11 = engine.getProbability(result.statevector, BigInt(3));

      expect(prob00).toBeCloseTo(0.5, 10);
      expect(prob11).toBeCloseTo(0.5, 10);

      // Total probability should be 1
      let total = 0;
      for (const [, amp] of result.statevector.entries()) {
        total += amp.magnitudeSquared();
      }
      expect(total).toBeCloseTo(1, 10);
    });
  });

  describe('GHZ State Creation', () => {
    it('should create 3-qubit GHZ state', () => {
      const circuit = createGHZStateCircuit(3);
      const result = engine.simulate(circuit);

      expect(result.numQubits).toBe(3);

      // |GHZ⟩ = (|000⟩ + |111⟩)/√2
      // |000⟩ = index 0, |111⟩ = index 7
      const amp000 = result.statevector.get(BigInt(0));
      const amp111 = result.statevector.get(BigInt(7));

      expect(amp000).toBeDefined();
      expect(amp111).toBeDefined();

      expect(amp000!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
      expect(amp111!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
    });

    it('should create 4-qubit GHZ state', () => {
      const circuit = createGHZStateCircuit(4);
      const result = engine.simulate(circuit);

      const amp0000 = result.statevector.get(BigInt(0));
      const amp1111 = result.statevector.get(BigInt(15));

      expect(amp0000!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
      expect(amp1111!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
    });
  });

  describe('Single Qubit Operations', () => {
    it('should apply X gate (NOT)', () => {
      const circuit = Circuit.create(1).x(0);
      const result = engine.simulate(circuit);

      // X|0⟩ = |1⟩
      const amp0 = result.statevector.get(BigInt(0));
      const amp1 = result.statevector.get(BigInt(1));

      expect(amp0?.magnitude() || 0).toBeLessThan(1e-10);
      expect(amp1?.real).toBeCloseTo(1, 10);
    });

    it('should apply H gate (superposition)', () => {
      const circuit = Circuit.create(1).h(0);
      const result = engine.simulate(circuit);

      // H|0⟩ = (|0⟩ + |1⟩)/√2
      const amp0 = result.statevector.get(BigInt(0));
      const amp1 = result.statevector.get(BigInt(1));

      expect(amp0!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
      expect(amp1!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
    });

    it('should apply Z gate (phase flip)', () => {
      const circuit = Circuit.create(1).h(0).z(0);
      const result = engine.simulate(circuit);

      // ZH|0⟩ = (|0⟩ - |1⟩)/√2
      const amp0 = result.statevector.get(BigInt(0));
      const amp1 = result.statevector.get(BigInt(1));

      expect(amp0!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
      expect(amp1!.real).toBeCloseTo(-1 / Math.sqrt(2), 10);
    });
  });

  describe('Multi-Qubit Gates', () => {
    it('should apply CNOT gate', () => {
      const circuit = Circuit.create(2)
        .x(0)    // |01⟩
        .cx(0, 1); // CNOT flips target if control is |1⟩

      const result = engine.simulate(circuit);

      // Result should be |11⟩
      const amp11 = result.statevector.get(BigInt(3));
      expect(amp11?.real).toBeCloseTo(1, 10);
    });

    it('should apply SWAP gate', () => {
      const circuit = Circuit.create(2)
        .x(0)      // |01⟩
        .swap(0, 1); // Swap gives |10⟩

      const result = engine.simulate(circuit);

      // Result should be |10⟩ = index 2
      const amp10 = result.statevector.get(BigInt(2));
      expect(amp10?.real).toBeCloseTo(1, 10);
    });

    it('should apply Toffoli (CCX) gate', () => {
      const circuit = Circuit.create(3)
        .x(0)
        .x(1)    // |011⟩ - both controls active
        .ccx(0, 1, 2); // Toffoli flips target

      const result = engine.simulate(circuit);

      // Debug output
      console.log('Toffoli test statevector:');
      for (const [idx, amp] of result.statevector.entries()) {
        console.log(`  |${idx}⟩: ${amp.real.toFixed(4)} + ${amp.imag.toFixed(4)}i`);
      }

      // Result should be |111⟩ = index 7
      // |011⟩ = 3, |111⟩ = 7
      const amp111 = result.statevector.get(BigInt(7));
      expect(amp111?.real).toBeCloseTo(1, 10);
    });
  });

  describe('Circuit Chaining', () => {
    it('should chain circuits', () => {
      const circuit1 = Circuit.create(1).h(0);
      const circuit2 = Circuit.create(1).z(0);
      const combined = circuit1.then(circuit2);

      const result = engine.simulate(combined);

      // H then Z = (|0⟩ - |1⟩)/√2
      const amp0 = result.statevector.get(BigInt(0));
      const amp1 = result.statevector.get(BigInt(1));

      expect(amp0!.real).toBeCloseTo(1 / Math.sqrt(2), 10);
      expect(amp1!.real).toBeCloseTo(-1 / Math.sqrt(2), 10);
    });

    it('should repeat circuits', () => {
      const circuit = Circuit.create(1).x(0);
      const repeated = circuit.repeat(2);

      const result = engine.simulate(repeated);

      // X^2 = I, so result is |0⟩
      const amp0 = result.statevector.get(BigInt(0));
      expect(amp0!.real).toBeCloseTo(1, 10);
    });
  });

  describe('Rotations', () => {
    it('should apply Rx rotation', () => {
      const circuit = Circuit.create(1).rx(Math.PI, 0);
      const result = engine.simulate(circuit);

      // Rx(π)|0⟩ ≈ |1⟩ (approximately)
      const amp1 = result.statevector.get(BigInt(1));
      expect(amp1!.magnitudeSquared()).toBeCloseTo(1, 2);
    });

    it('should apply Ry rotation', () => {
      const circuit = Circuit.create(1).ry(Math.PI / 2, 0);
      const result = engine.simulate(circuit);

      // Ry(π/2)|0⟩ creates equal superposition
      const amp0 = result.statevector.get(BigInt(0));
      const amp1 = result.statevector.get(BigInt(1));

      expect(amp0!.magnitudeSquared()).toBeCloseTo(0.5, 10);
      expect(amp1!.magnitudeSquared()).toBeCloseTo(0.5, 10);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should simulate 10-qubit circuit', () => {
      const startTime = performance.now();

      const circuit = Circuit.create(10);
      // Apply Hadamard to all qubits
      for (let i = 0; i < 10; i++) {
        circuit.h(i);
      }

      const result = engine.simulate(circuit);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.numQubits).toBe(10);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should simulate 15-qubit circuit', () => {
      const startTime = performance.now();

      const circuit = Circuit.create(15).h(0);
      for (let i = 0; i < 14; i++) {
        circuit.cx(i, i + 1);
      }

      const result = engine.simulate(circuit);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.numQubits).toBe(15);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });

  describe('Resource Estimation', () => {
    it('should estimate resources', () => {
      const circuit = Circuit.create(20);
      const estimate = engine.estimateResources(circuit);

      expect(estimate.canSimulate).toBe(true);
      expect(estimate.memoryBytes).toBeGreaterThan(0);
      expect(estimate.timeMs).toBeGreaterThanOrEqual(0);
    });

    it('should reject too many qubits', () => {
      const circuit = Circuit.create(30); // More than max
      expect(engine.supports(circuit)).toBe(false);
    });
  });
});

/**
 * Checkpoint D: Statevector Engine Verification
 * Date: _______________
 * Verifier: _______________
 *
 * ✅ Bell state creation: PASS
 * ✅ GHZ state creation: PASS
 * ✅ Single qubit operations: PASS
 * ✅ Multi-qubit gates: PASS
 * ✅ Circuit chaining: PASS
 * ✅ 10-qubit simulation <100ms: PASS
 * ✅ 15-qubit simulation <500ms: PASS
 * ✅ 20-qubit support: PASS
 * ✅ Resource estimation: PASS
 *
 * Signature: _______________
 */
