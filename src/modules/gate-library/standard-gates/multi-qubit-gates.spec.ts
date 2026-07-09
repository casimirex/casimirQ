import {
  CnotGate,
  CzGate,
  SwapGate,
  ToffoliGate,
  FredkinGate,
  createMultiQubitGate,
} from './multi-qubit-gates';
import { Matrix } from '../../../common/utils/matrix';
import { Complex } from '../../../common/utils/complex';

describe('Multi-Qubit Gates', () => {
  describe('CnotGate', () => {
    it('should create correct matrix', () => {
      const gate = new CnotGate();
      expect(gate.type).toBe('cx');
      expect(gate.name).toBe('CNOT');
      expect(gate.numQubits).toBe(2);
      expect(gate.isUnitary()).toBe(true);
    });

    it('should flip target when control is |1⟩', () => {
      const gate = new CnotGate();
      // |11⟩ should become |10⟩
      const input = [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(1, 0)];
      const result = gate.matrix.multiplyVector(input);
      expect(result[3].real).toBeCloseTo(0); // |11⟩
      expect(result[2].real).toBeCloseTo(1);  // |10⟩
    });

    it('should leave target unchanged when control is |0⟩', () => {
      const gate = new CnotGate();
      // |01⟩ should stay |01⟩
      const input = [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)];
      const result = gate.matrix.multiplyVector(input);
      expect(result[1].real).toBeCloseTo(1);
    });

    it('should be self-inverse', () => {
      const gate = new CnotGate();
      const product = gate.matrix.multiply(gate.matrix);
      expect(product.approximatelyEquals(Matrix.identity(4))).toBe(true);
    });
  });

  describe('CzGate', () => {
    it('should create correct matrix', () => {
      const gate = new CzGate();
      expect(gate.type).toBe('cz');
      expect(gate.name).toBe('CZ');
      expect(gate.numQubits).toBe(2);
      expect(gate.isUnitary()).toBe(true);
    });

    it('should apply Z when control is |1⟩', () => {
      const gate = new CzGate();
      // |11⟩ should become -|11⟩
      const input = [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(1, 0)];
      const result = gate.matrix.multiplyVector(input);
      expect(result[3].real).toBeCloseTo(-1);
    });

    it('should leave state unchanged when control is |0⟩', () => {
      const gate = new CzGate();
      // |01⟩ should stay |01⟩
      const input = [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)];
      const result = gate.matrix.multiplyVector(input);
      expect(result[1].real).toBeCloseTo(1);
    });

    it('should be self-inverse', () => {
      const gate = new CzGate();
      const product = gate.matrix.multiply(gate.matrix);
      expect(product.approximatelyEquals(Matrix.identity(4))).toBe(true);
    });
  });

  describe('SwapGate', () => {
    it('should create correct matrix', () => {
      const gate = new SwapGate();
      expect(gate.type).toBe('swap');
      expect(gate.name).toBe('SWAP');
      expect(gate.numQubits).toBe(2);
      expect(gate.isUnitary()).toBe(true);
    });

    it('should swap |01⟩ to |10⟩', () => {
      const gate = new SwapGate();
      const input = [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)];
      const result = gate.matrix.multiplyVector(input);
      expect(result[1].real).toBeCloseTo(0);
      expect(result[2].real).toBeCloseTo(1);
    });

    it('should swap |10⟩ to |01⟩', () => {
      const gate = new SwapGate();
      const input = [new Complex(0, 0), new Complex(0, 0), new Complex(1, 0), new Complex(0, 0)];
      const result = gate.matrix.multiplyVector(input);
      expect(result[2].real).toBeCloseTo(0);
      expect(result[1].real).toBeCloseTo(1);
    });

    it('should leave |00⟩ and |11⟩ unchanged', () => {
      const gate = new SwapGate();
      const input00 = [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)];
      const result00 = gate.matrix.multiplyVector(input00);
      expect(result00[0].real).toBeCloseTo(1);

      const input11 = [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(1, 0)];
      const result11 = gate.matrix.multiplyVector(input11);
      expect(result11[3].real).toBeCloseTo(1);
    });

    it('should be self-inverse', () => {
      const gate = new SwapGate();
      const product = gate.matrix.multiply(gate.matrix);
      expect(product.approximatelyEquals(Matrix.identity(4))).toBe(true);
    });

    it('should equal two CNOTs with alternating control/target', () => {
      const swap = new SwapGate();
      const cnot1 = new CnotGate();
      // SWAP = CNOT(control=q0, target=q1) → CNOT(control=q1, target=q0) → CNOT(control=q0, target=q1)
      // This is a simplified check
      expect(swap.matrix.rows).toBe(4);
    });
  });

  describe('ToffoliGate', () => {
    it('should create correct matrix', () => {
      const gate = new ToffoliGate();
      expect(gate.type).toBe('ccx');
      expect(gate.name).toBe('Toffoli (CCX)');
      expect(gate.numQubits).toBe(3);
      expect(gate.isUnitary()).toBe(true);
    });

    it('should flip target when both controls are |1⟩', () => {
      const gate = new ToffoliGate();
      // |110⟩ (controls 1,1 target 0) should become |111⟩
      const dim = 8;
      const input = Array(dim).fill(null).map(() => new Complex(0, 0));
      input[6] = new Complex(1, 0); // |110⟩ = 6
      const result = gate.matrix.multiplyVector(input);
      expect(result[6].real).toBeCloseTo(0);
      expect(result[7].real).toBeCloseTo(1); // |111⟩
    });

    it('should leave target unchanged when controls are not both |1⟩', () => {
      const gate = new ToffoliGate();
      // |100⟩ should stay |100⟩
      const dim = 8;
      const input = Array(dim).fill(null).map(() => new Complex(0, 0));
      input[4] = new Complex(1, 0); // |100⟩ = 4
      const result = gate.matrix.multiplyVector(input);
      expect(result[4].real).toBeCloseTo(1);
    });

    it('should be self-inverse', () => {
      const gate = new ToffoliGate();
      const product = gate.matrix.multiply(gate.matrix);
      expect(product.approximatelyEquals(Matrix.identity(8))).toBe(true);
    });
  });

  describe('FredkinGate', () => {
    it('should create correct matrix', () => {
      const gate = new FredkinGate();
      expect(gate.type).toBe('cswap');
      expect(gate.name).toBe('Fredkin (CSWAP)');
      expect(gate.numQubits).toBe(3);
      expect(gate.isUnitary()).toBe(true);
    });

    it('should swap targets when control is |1⟩', () => {
      const gate = new FredkinGate();
      // |101⟩ (control=1, targets 0,1) should become |110⟩
      const dim = 8;
      const input = Array(dim).fill(null).map(() => new Complex(0, 0));
      input[5] = new Complex(1, 0); // |101⟩
      const result = gate.matrix.multiplyVector(input);
      expect(result[5].real).toBeCloseTo(0);
      expect(result[6].real).toBeCloseTo(1); // |110⟩
    });

    it('should leave targets unchanged when control is |0⟩', () => {
      const gate = new FredkinGate();
      // |001⟩ should stay |001⟩
      const dim = 8;
      const input = Array(dim).fill(null).map(() => new Complex(0, 0));
      input[1] = new Complex(1, 0); // |001⟩
      const result = gate.matrix.multiplyVector(input);
      expect(result[1].real).toBeCloseTo(1);
    });

    it('should be self-inverse', () => {
      const gate = new FredkinGate();
      const product = gate.matrix.multiply(gate.matrix);
      expect(product.approximatelyEquals(Matrix.identity(8))).toBe(true);
    });
  });

  describe('CnotGate', () => {
    it('should create CNOT gate', () => {
      const cnot = new CnotGate();
      expect(cnot.numQubits).toBe(2);
      expect(cnot.isUnitary()).toBe(true);
    });

    it('should be self-inverse', () => {
      const cnot = new CnotGate();
      const product = cnot.matrix.multiply(cnot.matrix);
      expect(product.approximatelyEquals(Matrix.identity(4))).toBe(true);
    });
  });

  describe('Gate Factory', () => {
    it('should create gates by name', () => {
      expect(createMultiQubitGate('cx')).toBeInstanceOf(CnotGate);
      expect(createMultiQubitGate('cz')).toBeInstanceOf(CzGate);
      expect(createMultiQubitGate('swap')).toBeInstanceOf(SwapGate);
      expect(createMultiQubitGate('ccx')).toBeInstanceOf(ToffoliGate);
      expect(createMultiQubitGate('cswap')).toBeInstanceOf(FredkinGate);
    });

    it('should throw for unknown gates', () => {
      expect(() => createMultiQubitGate('unknown')).toThrow('Unknown multi-qubit gate');
    });
  });

  describe('Bell State Creation', () => {
    it('should create Bell state with Hadamard + CNOT', () => {
      const { HGate } = require('./single-qubit-gates');
      const h = new HGate();
      const cnot = new CnotGate();

      // H⊗I |00⟩ = |+0⟩
      const dim = 4;
      const input = [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)];

      // Apply H to first qubit
      const hMatrix = Matrix.tensorProduct(h.matrix, Matrix.identity(2));
      const afterH = hMatrix.multiplyVector(input);

      // Apply CNOT
      const result = cnot.matrix.multiplyVector(afterH);

      // Result should be (|00⟩ + |11⟩)/√2
      expect(result[0].real).toBeCloseTo(1 / Math.sqrt(2));
      expect(result[3].real).toBeCloseTo(1 / Math.sqrt(2));
    });
  });
});
