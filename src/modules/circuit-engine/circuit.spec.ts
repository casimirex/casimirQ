import { Circuit, CircuitBuilder, createBellStateCircuit, createGHZStateCircuit, createWStateCircuit, createQFTCircuit } from './circuit';
import { Matrix } from '../../common/utils/matrix';
import { Complex } from '../../common/utils/complex';

describe('Circuit', () => {
  describe('Basic Construction', () => {
    it('should create empty circuit', () => {
      const circuit = Circuit.create(2);
      expect(circuit.numQubits).toBe(2);
      expect(circuit.isEmpty()).toBe(true);
      expect(circuit.gateCount()).toBe(0);
    });

    it('should create named circuit', () => {
      const circuit = Circuit.create(3, 'test-circuit');
      expect(circuit.name).toBe('test-circuit');
    });

    it('should reject invalid qubit counts', () => {
      expect(() => Circuit.create(0)).toThrow();
      expect(() => Circuit.create(-1)).toThrow();
    });
  });

  describe('Gate Application', () => {
    it('should apply single-qubit gates', () => {
      let circuit = Circuit.create(2);
      circuit = circuit.h(0).x(1).y(0).z(1).s(0).t(1);
      expect(circuit.gateCount()).toBe(6);
    });

    it('should apply two-qubit gates', () => {
      let circuit = Circuit.create(2);
      circuit = circuit.cx(0, 1).cz(0, 1).swap(0, 1);
      expect(circuit.gateCount()).toBe(3);
    });

    it('should apply three-qubit gates', () => {
      let circuit = Circuit.create(3);
      circuit = circuit.ccx(0, 1, 2).cswap(0, 1, 2);
      expect(circuit.gateCount()).toBe(2);
    });

    it('should apply rotation gates', () => {
      let circuit = Circuit.create(1);
      circuit = circuit.rx(0.5, 0).ry(1.0, 0).rz(1.5, 0);
      expect(circuit.gateCount()).toBe(3);
    });

    it('should apply phase gates', () => {
      let circuit = Circuit.create(2);
      circuit = circuit.p(Math.PI / 4, 0).cp(0, 1, Math.PI / 2);
      expect(circuit.gateCount()).toBe(2);
    });

    it('should apply dagger gates', () => {
      let circuit = Circuit.create(1);
      circuit = circuit.sdg(0).tdg(0);
      expect(circuit.gateCount()).toBe(2);
    });

    it('should apply controlled rotation gates', () => {
      let circuit = Circuit.create(2);
      circuit = circuit.crx(0, 1, Math.PI / 2)
        .cry(0, 1, Math.PI / 2)
        .crz(0, 1, Math.PI / 2);
      expect(circuit.gateCount()).toBe(3);
    });

    it('should reject invalid qubit indices', () => {
      const circuit = Circuit.create(2);
      expect(() => circuit.h(2)).toThrow();
      expect(() => circuit.h(-1)).toThrow();
    });

    it('should reject control being target', () => {
      const circuit = Circuit.create(2);
      expect(() => circuit.cx(0, 0)).toThrow();
    });

    it('should reject gates on out-of-range qubits', () => {
      const circuit = Circuit.create(2);
      expect(() => circuit.cx(0, 2)).toThrow();
    });
  });

  describe('Circuit Composition', () => {
    it('should chain circuits', () => {
      const c1 = Circuit.create(2).h(0);
      const c2 = Circuit.create(2).cx(0, 1);
      const combined = c1.then(c2);
      expect(combined.gateCount()).toBe(2);
    });

    it('should compose circuits (alias)', () => {
      const c1 = Circuit.create(2).h(0);
      const c2 = Circuit.create(2).cx(0, 1);
      const combined = c1.compose(c2);
      expect(combined.gateCount()).toBe(2);
    });

    it('should reject chaining different qubit counts', () => {
      const c1 = Circuit.create(2);
      const c2 = Circuit.create(3);
      expect(() => c1.then(c2)).toThrow();
    });

    it('should repeat circuit', () => {
      const circuit = Circuit.create(1).x(0);
      const repeated = circuit.repeat(3);
      expect(repeated.gateCount()).toBe(3);
    });
  });

  describe('Circuit Metadata', () => {
    it('should return correct metadata', () => {
      const circuit = Circuit.create(3, 'test')
        .h(0)
        .cx(0, 1)
        .cx(1, 2);

      const metadata = circuit.getMetadata();
      expect(metadata.qubitCount).toBe(3);
      expect(metadata.gateCount).toBe(3);
      expect(metadata.operationCount).toBe(3);
      expect(metadata.gateCounts['Hadamard']).toBe(1);
      expect(metadata.gateCounts['Pauli-X']).toBe(2);
      expect(metadata.multiQubitGateCount).toBe(2);
    });

    it('should calculate depth', () => {
      const circuit = Circuit.create(2)
        .h(0)
        .cx(0, 1)
        .h(1);
      expect(circuit.depth()).toBe(3);
    });

    it('should count gates by type', () => {
      const circuit = Circuit.create(2)
        .h(0)
        .h(1)
        .cx(0, 1);
      const counts = circuit.gateCountByType();
      expect(counts.get('h')).toBe(2);
      expect(counts.get('x')).toBe(1);
    });
  });

  describe('Circuit State', () => {
    it('should check if empty', () => {
      const empty = Circuit.create(2);
      const nonEmpty = Circuit.create(2).h(0);
      expect(empty.isEmpty()).toBe(true);
      expect(nonEmpty.isEmpty()).toBe(false);
    });

    it('should create copy', () => {
      const original = Circuit.create(2).h(0).cx(0, 1);
      const copy = original.copy();
      expect(copy.gateCount()).toBe(original.gateCount());
      expect(copy).not.toBe(original);
    });
  });

  describe('Serialization', () => {
    it('should convert to JSON', () => {
      const circuit = Circuit.create(2, 'test').h(0).cx(0, 1);
      const json = circuit.toJSON() as any;
      expect(json).toHaveProperty('numQubits', 2);
      expect(json).toHaveProperty('name', 'test');
      expect(json).toHaveProperty('operations');
      expect(json.operations).toHaveLength(2);
    });

    it('should convert to string', () => {
      const circuit = Circuit.create(2).h(0);
      const str = circuit.toString();
      expect(str).toContain('Circuit');
      expect(str).toContain('2 qubits');
      expect(str).toContain('Hadamard');
    });
  });

  describe('CircuitBuilder', () => {
    it('should build circuit fluently', () => {
      const circuit = Circuit.builder(2)
        .h(0)
        .cx(0, 1)
        .measure(0)
        .build();

      expect(circuit.getMetadata().gateCount).toBe(3);
    });

    it('should support all gate methods', () => {
      const circuit = Circuit.builder(3)
        .h(0).x(1).y(2).z(0)
        .s(1).sdg(2).t(0).tdg(1)
        .cx(0, 1).cy(1, 2).cz(0, 2)
        .ch(0, 1).swap(1, 2)
        .ccx(0, 1, 2).cswap(0, 1, 2)
        .rx(0, 0.5).ry(1, 0.5).rz(2, 0.5)
        .p(0, Math.PI / 4).cp(0, 1, Math.PI / 2)
        .crx(0, 1, 0.5).cry(0, 1, 0.5).crz(0, 1, 0.5)
        .barrier()
        .measure(0)
        .build();

      expect(circuit.getMetadata().gateCount).toBeGreaterThan(20);
    });

    it('should handle barrier with targets', () => {
      const circuit = Circuit.builder(3)
        .barrier([0, 1])
        .build();
      expect(circuit.getMetadata().gateCount).toBe(1);
    });
  });

  describe('Pre-built Circuits', () => {
    it('should create Bell state', () => {
      const circuit = createBellStateCircuit();
      expect(circuit.numQubits).toBe(2);
      expect(circuit.name).toContain('Bell State');
    });

    it('should create GHZ state', () => {
      const circuit = createGHZStateCircuit(4);
      expect(circuit.numQubits).toBe(4);
      expect(circuit.name).toContain('GHZ');
    });

    it('should create W state', () => {
      const circuit = createWStateCircuit(3);
      expect(circuit.numQubits).toBe(3);
      expect(circuit.name).toContain('W State');
    });

    it('should create QFT circuit', () => {
      const circuit = createQFTCircuit(3);
      expect(circuit.numQubits).toBe(3);
      expect(circuit.name).toContain('QFT');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single qubit circuit', () => {
      const circuit = Circuit.create(1).h(0).x(0);
      expect(circuit.numQubits).toBe(1);
      expect(circuit.gateCount()).toBe(2);
    });

    it('should handle large circuit', () => {
      let circuit = Circuit.create(10);
      for (let i = 0; i < 9; i++) {
        circuit = circuit.cx(i, i + 1);
      }
      expect(circuit.numQubits).toBe(10);
      expect(circuit.gateCount()).toBe(9);
    });

    it('should handle complex gate sequences', () => {
      const circuit = Circuit.create(3)
        .h(0)
        .cx(0, 1)
        .cx(1, 2)
        .h(0).h(1).h(2)
        .cx(0, 1)
        .swap(1, 2)
        .ccx(0, 1, 2);

      expect(circuit.numQubits).toBe(3);
      expect(circuit.gateCount()).toBe(9);
    });
  });
});

// Add Matrix multiplyVector extension for tests
declare module '../../common/utils/matrix' {
  interface Matrix {
    multiplyVector(vector: Complex[]): Complex[];
  }
}

Matrix.prototype.multiplyVector = function(vector: Complex[]): Complex[] {
  const result: Complex[] = [];
  const dim = this.rows;
  for (let i = 0; i < dim; i++) {
    let sum = new Complex(0, 0);
    for (let j = 0; j < dim; j++) {
      sum = sum.add(this.get(i, j).multiply(vector[j]));
    }
    result.push(sum);
  }
  return result;
};
