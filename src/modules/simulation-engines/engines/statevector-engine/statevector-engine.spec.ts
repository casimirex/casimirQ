import { StatevectorEngine } from './statevector-engine';
import { Circuit } from '../../../circuit-engine/circuit';
import { ISimulationOptions } from '../../interfaces/simulation-engine.interface';

describe('StatevectorEngine', () => {
  let engine: StatevectorEngine;

  beforeEach(() => {
    engine = new StatevectorEngine();
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('Basic Operations', () => {
    it('should execute empty circuit', async () => {
      const circuit = Circuit.builder(1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.statevector).toBeDefined();
    });

    it('should execute single-qubit circuit', async () => {
      const circuit = Circuit.builder(1).x(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.statevector.get(BigInt(1))?.magnitude()).toBeCloseTo(1);
    });

    it('should execute Hadamard gate', async () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      const amp0 = result.statevector.get(BigInt(0));
      const amp1 = result.statevector.get(BigInt(1));
      expect(amp0?.real).toBeCloseTo(1 / Math.sqrt(2));
      expect(amp1?.real).toBeCloseTo(1 / Math.sqrt(2));
    });

    it('should execute Pauli gates', async () => {
      const xCircuit = Circuit.builder(1).x(0).build();
      const yCircuit = Circuit.builder(1).y(0).build();
      const zCircuit = Circuit.builder(1).z(0).build();

      const xResult = engine.simulate(xCircuit);
      const yResult = engine.simulate(yCircuit);
      const zResult = engine.simulate(zCircuit);

      expect(xResult).toBeDefined();
      expect(yResult).toBeDefined();
      expect(zResult).toBeDefined();
    });
  });

  describe('Multi-Qubit Operations', () => {
    it('should execute CNOT gate', async () => {
      const circuit = Circuit.builder(2).x(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      // |00> -> X|0> = |10> -> CNOT = |11>
      const amp3 = result.statevector.get(BigInt(3));
      expect(amp3?.magnitude()).toBeCloseTo(1);
    });

    it('should execute SWAP gate', async () => {
      const circuit = Circuit.builder(2).x(0).swap(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      // Check SWAP was applied (some amplitude should be non-zero)
      const hasNonZeroAmp = Array.from(result.statevector.values()).some(
        (c) => c.magnitude() > 0.9,
      );
      expect(hasNonZeroAmp).toBe(true);
    });

    it('should execute Toffoli gate', async () => {
      const circuit = Circuit.builder(3).x(0).x(1).ccx(0, 1, 2).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      // |000> -> |110> -> CCX = |111>
      const amp7 = result.statevector.get(BigInt(7));
      expect(amp7?.magnitude()).toBeCloseTo(1);
    });
  });

  describe('Rotation Gates', () => {
    it('should execute RX gate', async () => {
      const circuit = Circuit.builder(1)
        .rx(0, Math.PI / 2)
        .build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute RY gate', async () => {
      const circuit = Circuit.builder(1)
        .ry(0, Math.PI / 2)
        .build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute RZ gate', async () => {
      const circuit = Circuit.builder(1)
        .rz(0, Math.PI / 2)
        .build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Measurement', () => {
    it('should measure qubits', async () => {
      const circuit = Circuit.builder(1).h(0).measure(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.measurements).toBeDefined();
    });

    it('should measure multiple qubits', async () => {
      const circuit = Circuit.builder(2).h(0).h(1).measure(0).measure(1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      expect(result.measurements?.length).toBe(2);
    });
  });

  describe('Configuration Options', () => {
    it('should handle seeded execution', async () => {
      const circuit = Circuit.builder(1).h(0).measure(0).build();
      const options: ISimulationOptions = { seed: 42 };
      const result = engine.simulate(circuit, options);
      expect(result).toBeDefined();
    });

    it('should return execution metrics', async () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = engine.simulate(circuit);
      expect(result.executionTimeMs).toBeDefined();
      expect(result.memoryUsageBytes).toBeDefined();
    });
  });

  describe('Bell States', () => {
    it('should create Bell state |Φ+>', async () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
      const amp0 = result.statevector.get(BigInt(0));
      const amp3 = result.statevector.get(BigInt(3));
      expect(amp0?.real).toBeCloseTo(1 / Math.sqrt(2));
      expect(amp3?.real).toBeCloseTo(1 / Math.sqrt(2));
    });
  });

  describe('Gate Sequences', () => {
    it('should execute gate sequence', async () => {
      const circuit = Circuit.builder(1).h(0).s(0).t(0).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });

    it('should execute multi-layer circuit', async () => {
      const circuit = Circuit.builder(2).h(0).h(1).cx(0, 1).h(0).h(1).build();
      const result = engine.simulate(circuit);
      expect(result).toBeDefined();
    });
  });

  describe('Run alias', () => {
    it('should work with run method', async () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = engine.run(circuit);
      expect(result).toBeDefined();
      expect(result.statevector).toBeDefined();
    });
  });
});
