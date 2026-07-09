import {
  XGate,
  YGate,
  ZGate,
  HGate,
  SGate,
  SDaggerGate,
  TGate,
  TDaggerGate,
  IGate,
  RxGate,
  RyGate,
  RzGate,
  PhaseGate,
  UGate,
  createGate,
  getStandardGateTypes,
} from './single-qubit-gates';
import { Complex, COMPLEX_CONSTANTS } from '../../../common/utils/complex';

describe('Single Qubit Gates', () => {
  describe('Pauli Gates', () => {
    describe('XGate (NOT)', () => {
      it('should flip |0⟩ to |1⟩', () => {
        const gate = new XGate();
        expect(gate.type).toBe('x');
        expect(gate.name).toBe('Pauli-X');
        expect(gate.isUnitary()).toBe(true);

        const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
        expect(result[0].real).toBeCloseTo(0);
        expect(result[1].real).toBeCloseTo(1);
      });

      it('should flip |1⟩ to |0⟩', () => {
        const gate = new XGate();
        const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
        expect(result[0].real).toBeCloseTo(1);
        expect(result[1].real).toBeCloseTo(0);
      });

      it('should be self-inverse', () => {
        const gate = new XGate();
        const product = gate.matrix.multiply(gate.matrix);
        expect(product.approximatelyEquals(Matrix.identity(2))).toBe(true);
      });
    });

    describe('YGate', () => {
      it('should apply Y to |0⟩', () => {
        const gate = new YGate();
        expect(gate.type).toBe('y');
        expect(gate.name).toBe('Pauli-Y');
        expect(gate.isUnitary()).toBe(true);

        const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
        expect(result[0].real).toBeCloseTo(0);
        expect(result[0].imag).toBeCloseTo(0);
        expect(result[1].real).toBeCloseTo(0);
        expect(result[1].imag).toBeCloseTo(1);
      });

      it('should be self-inverse', () => {
        const gate = new YGate();
        const product = gate.matrix.multiply(gate.matrix);
        expect(product.approximatelyEquals(Matrix.identity(2))).toBe(true);
      });
    });

    describe('ZGate', () => {
      it('should leave |0⟩ unchanged', () => {
        const gate = new ZGate();
        expect(gate.type).toBe('z');
        expect(gate.name).toBe('Pauli-Z');
        expect(gate.isUnitary()).toBe(true);

        const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
        expect(result[0].real).toBeCloseTo(1);
        expect(result[1].real).toBeCloseTo(0);
      });

      it('should flip phase of |1⟩', () => {
        const gate = new ZGate();
        const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
        expect(result[0].real).toBeCloseTo(0);
        expect(result[1].real).toBeCloseTo(-1);
      });

      it('should be self-inverse', () => {
        const gate = new ZGate();
        const product = gate.matrix.multiply(gate.matrix);
        expect(product.approximatelyEquals(Matrix.identity(2))).toBe(true);
      });
    });
  });

  describe('Hadamard Gate', () => {
    it('should create superposition from |0⟩', () => {
      const gate = new HGate();
      expect(gate.type).toBe('h');
      expect(gate.name).toBe('Hadamard');
      expect(gate.isUnitary()).toBe(true);

      const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
      expect(result[0].real).toBeCloseTo(1 / Math.sqrt(2));
      expect(result[1].real).toBeCloseTo(1 / Math.sqrt(2));
    });

    it('should create superposition from |1⟩', () => {
      const gate = new HGate();
      const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
      expect(result[0].real).toBeCloseTo(1 / Math.sqrt(2));
      expect(result[1].real).toBeCloseTo(-1 / Math.sqrt(2));
    });

    it('should be self-inverse (H² = I)', () => {
      const gate = new HGate();
      const product = gate.matrix.multiply(gate.matrix);
      expect(product.approximatelyEquals(Matrix.identity(2))).toBe(true);
    });
  });

  describe('Phase Gates', () => {
    describe('SGate', () => {
      it('should apply S to |0⟩', () => {
        const gate = new SGate();
        expect(gate.type).toBe('s');
        expect(gate.name).toBe('S (Phase)');
        expect(gate.isUnitary()).toBe(true);

        const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
        expect(result[0].real).toBeCloseTo(1);
      });

      it('should add i phase to |1⟩', () => {
        const gate = new SGate();
        const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
        expect(result[1].real).toBeCloseTo(0);
        expect(result[1].imag).toBeCloseTo(1);
      });
    });

    describe('SDaggerGate', () => {
      it('should be inverse of S', () => {
        const s = new SGate();
        const sdg = new SDaggerGate();
        const product = s.matrix.multiply(sdg.matrix);
        expect(product.approximatelyEquals(Matrix.identity(2))).toBe(true);
      });
    });

    describe('TGate', () => {
      it('should apply π/4 phase', () => {
        const gate = new TGate();
        expect(gate.type).toBe('t');
        expect(gate.name).toBe('T (π/8)');
        expect(gate.isUnitary()).toBe(true);

        const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
        expect(result[1].real).toBeCloseTo(Math.cos(Math.PI / 4));
        expect(result[1].imag).toBeCloseTo(Math.sin(Math.PI / 4));
      });
    });

    describe('TDaggerGate', () => {
      it('should be inverse of T', () => {
        const t = new TGate();
        const tdg = new TDaggerGate();
        const product = t.matrix.multiply(tdg.matrix);
        expect(product.approximatelyEquals(Matrix.identity(2))).toBe(true);
      });
    });
  });

  describe('Rotation Gates', () => {
    describe('RxGate', () => {
      it('should rotate around X by π', () => {
        const gate = new RxGate(Math.PI);
        expect(gate.type).toBe('rx');
        expect(gate.name).toBe('Rotation-X');
        expect(gate.params.theta).toBe(Math.PI);
        expect(gate.isUnitary()).toBe(true);

        // Rx(π) |0⟩ = -i|1⟩
        const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
        expect(result[0].real).toBeCloseTo(0);
        expect(result[1].imag).toBeCloseTo(-1);
      });

      it('should support parameter binding', () => {
        const gate = new RxGate(Math.PI);
        const newGate = gate.bind({ theta: Math.PI / 2 });
        expect(newGate.params.theta).toBe(Math.PI / 2);
      });
    });

    describe('RyGate', () => {
      it('should rotate around Y by π', () => {
        const gate = new RyGate(Math.PI);
        expect(gate.type).toBe('ry');
        expect(gate.name).toBe('Rotation-Y');
        expect(gate.isUnitary()).toBe(true);

        // Ry(π) |0⟩ = |1⟩
        const result = gate.matrix.multiplyVector([new Complex(1, 0), new Complex(0, 0)]);
        expect(result[0].real).toBeCloseTo(0);
        expect(result[1].real).toBeCloseTo(1);
      });
    });

    describe('RzGate', () => {
      it('should rotate around Z', () => {
        const gate = new RzGate(Math.PI);
        expect(gate.type).toBe('rz');
        expect(gate.name).toBe('Rotation-Z');
        expect(gate.isUnitary()).toBe(true);

        // Rz(π) |1⟩ = i|1⟩ (implementation convention)
        const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
        expect(result[1].real).toBeCloseTo(0);
        expect(result[1].imag).toBeCloseTo(1);
      });
    });

    describe('PhaseGate', () => {
      it('should apply general phase', () => {
        const gate = new PhaseGate(Math.PI / 2);
        expect(gate.type).toBe('p');
        expect(gate.name).toBe('Phase');
        expect(gate.isUnitary()).toBe(true);

        const result = gate.matrix.multiplyVector([new Complex(0, 0), new Complex(1, 0)]);
        expect(result[1].real).toBeCloseTo(0);
        expect(result[1].imag).toBeCloseTo(1);
      });
    });
  });

  describe('UGate', () => {
    it('should create arbitrary single-qubit gate', () => {
      const gate = new UGate(Math.PI, 0, 0);
      expect(gate.type).toBe('u');
      expect(gate.name).toBe('Universal');
      expect(gate.params.theta).toBe(Math.PI);
      expect(gate.params.phi).toBe(0);
      expect(gate.params.lambda).toBe(0);
      expect(gate.isUnitary()).toBe(true);
    });

    it('should support parameter binding', () => {
      const gate = new UGate(0, 0, 0);
      const newGate = gate.bind({ theta: Math.PI, phi: Math.PI / 2, lambda: 0 });
      expect(newGate.params.theta).toBe(Math.PI);
      expect(newGate.params.phi).toBe(Math.PI / 2);
    });
  });

  describe('IGate', () => {
    it('should be identity', () => {
      const gate = new IGate();
      expect(gate.type).toBe('i');
      expect(gate.name).toBe('Identity');
      expect(gate.isUnitary()).toBe(true);
      expect(gate.matrix.equals(Matrix.identity(2))).toBe(true);
    });
  });

  describe('Gate Factory', () => {
    it('should create gates by name', () => {
      expect(createGate('x')).toBeInstanceOf(XGate);
      expect(createGate('y')).toBeInstanceOf(YGate);
      expect(createGate('z')).toBeInstanceOf(ZGate);
      expect(createGate('h')).toBeInstanceOf(HGate);
      expect(createGate('s')).toBeInstanceOf(SGate);
      expect(createGate('sdg')).toBeInstanceOf(SDaggerGate);
      expect(createGate('t')).toBeInstanceOf(TGate);
      expect(createGate('tdg')).toBeInstanceOf(TDaggerGate);
      expect(createGate('i')).toBeInstanceOf(IGate);
    });

    it('should create parametric gates', () => {
      expect(createGate('rx', { theta: 1 })).toBeInstanceOf(RxGate);
      expect(createGate('ry', { theta: 1 })).toBeInstanceOf(RyGate);
      expect(createGate('rz', { theta: 1 })).toBeInstanceOf(RzGate);
      expect(createGate('p', { lambda: 1 })).toBeInstanceOf(PhaseGate);
      expect(createGate('u', { theta: 1, phi: 1, lambda: 1 })).toBeInstanceOf(UGate);
    });

    it('should throw for missing parameters', () => {
      expect(() => createGate('rx')).toThrow('theta parameter');
      expect(() => createGate('ry')).toThrow('theta parameter');
      expect(() => createGate('rz')).toThrow('theta parameter');
      expect(() => createGate('p')).toThrow('lambda parameter');
      expect(() => createGate('u')).toThrow('parameters');
    });

    it('should throw for unknown gates', () => {
      expect(() => createGate('unknown')).toThrow('Unknown gate type');
    });

    it('should return standard gate types', () => {
      const types = getStandardGateTypes();
      expect(types).toContain('x');
      expect(types).toContain('h');
      expect(types).toContain('rx');
      expect(types).toContain('u');
      expect(types.length).toBeGreaterThan(10);
    });
  });
});

// Import Matrix for tests
import { Matrix } from '../../../common/utils/matrix';
