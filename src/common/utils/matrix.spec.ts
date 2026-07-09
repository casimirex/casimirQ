import { Matrix, matrixPower, controlledGate } from './matrix';
import { Complex } from './complex';

describe('Matrix', () => {
  describe('Construction', () => {
    it('should create a matrix from complex data', () => {
      const data = [
        [new Complex(1, 0), new Complex(0, 1)],
        [new Complex(0, -1), new Complex(-1, 0)],
      ];
      const matrix = new Matrix(data);
      expect(matrix.rows).toBe(2);
      expect(matrix.cols).toBe(2);
    });

    it('should create from real data', () => {
      const matrix = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      expect(matrix.rows).toBe(2);
      expect(matrix.cols).toBe(2);
      expect(matrix.get(0, 0).real).toBe(1);
      expect(matrix.get(0, 0).imag).toBe(0);
    });

    it('should create from tuples', () => {
      const matrix = Matrix.fromTuples([
        [[1, 2], [3, 4]],
        [[5, 6], [7, 8]],
      ]);
      expect(matrix.get(0, 0).real).toBe(1);
      expect(matrix.get(0, 0).imag).toBe(2);
      expect(matrix.get(1, 1).real).toBe(7);
      expect(matrix.get(1, 1).imag).toBe(8);
    });

    it('should throw on empty data', () => {
      expect(() => new Matrix([])).toThrow('Matrix must have at least 1 row');
    });

    it('should throw on inconsistent row lengths', () => {
      const data = [
        [new Complex(1, 0), new Complex(0, 1)],
        [new Complex(0, 0)],
      ];
      expect(() => new Matrix(data)).toThrow('All rows must have the same number of columns');
    });
  });

  describe('Factory Methods', () => {
    it('should create identity matrix', () => {
      const I = Matrix.identity(3);
      expect(I.rows).toBe(3);
      expect(I.cols).toBe(3);
      expect(I.get(0, 0).real).toBe(1);
      expect(I.get(1, 1).real).toBe(1);
      expect(I.get(2, 2).real).toBe(1);
      expect(I.get(0, 1).real).toBe(0);
    });

    it('should create zero matrix', () => {
      const Z = Matrix.zero(2, 3);
      expect(Z.rows).toBe(2);
      expect(Z.cols).toBe(3);
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          expect(Z.get(i, j).isZero()).toBe(true);
        }
      }
    });

    it('should create zerosLike', () => {
      const m = new Matrix([
        [new Complex(1, 2), new Complex(3, 4)],
        [new Complex(5, 6), new Complex(7, 8)],
      ]);
      const z = m.zerosLike();
      expect(z.rows).toBe(2);
      expect(z.cols).toBe(2);
      expect(z.get(0, 0).isZero()).toBe(true);
    });

    it('should create identityLike', () => {
      const m = new Matrix([
        [new Complex(1, 2), new Complex(3, 4)],
        [new Complex(5, 6), new Complex(7, 8)],
      ]);
      const i = m.identityLike();
      expect(i.get(0, 0).real).toBe(1);
      expect(i.get(1, 1).real).toBe(1);
      expect(i.get(0, 1).real).toBe(0);
    });

    it('should throw identityLike on non-square', () => {
      const m = Matrix.zero(2, 3);
      expect(() => m.identityLike()).toThrow('Identity matrix must be square');
    });
  });

  describe('Element Access', () => {
    it('should get element', () => {
      const m = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      expect(m.get(0, 0).real).toBe(1);
      expect(m.get(1, 1).real).toBe(4);
    });

    it('should throw on out of bounds get', () => {
      const m = Matrix.zero(2, 2);
      expect(() => m.get(2, 0)).toThrow('Index out of bounds');
      expect(() => m.get(0, 2)).toThrow('Index out of bounds');
    });

    it('should set element immutably', () => {
      const m = Matrix.zero(2, 2);
      const m2 = m.set(0, 1, new Complex(5, 0));
      expect(m.get(0, 1).isZero()).toBe(true);
      expect(m2.get(0, 1).real).toBe(5);
    });
  });

  describe('Addition', () => {
    it('should add two matrices', () => {
      const a = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const b = Matrix.fromReal([
        [5, 6],
        [7, 8],
      ]);
      const result = a.add(b);
      expect(result.get(0, 0).real).toBe(6);
      expect(result.get(1, 1).real).toBe(12);
    });

    it('should throw on mismatched dimensions', () => {
      const a = Matrix.zero(2, 2);
      const b = Matrix.zero(2, 3);
      expect(() => a.add(b)).toThrow('same dimensions');
    });

    it('should be immutable', () => {
      const a = Matrix.fromReal([[1, 2], [3, 4]]);
      const b = Matrix.fromReal([[1, 1], [1, 1]]);
      a.add(b);
      expect(a.get(0, 0).real).toBe(1);
    });
  });

  describe('Subtraction', () => {
    it('should subtract two matrices', () => {
      const a = Matrix.fromReal([
        [5, 6],
        [7, 8],
      ]);
      const b = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const result = a.sub(b);
      expect(result.get(0, 0).real).toBe(4);
      expect(result.get(1, 1).real).toBe(4);
    });
  });

  describe('Scaling', () => {
    it('should scale by complex', () => {
      const m = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const scalar = new Complex(2, 0);
      const result = m.scale(scalar);
      expect(result.get(0, 0).real).toBe(2);
      expect(result.get(1, 1).real).toBe(8);
    });

    it('should scale by real', () => {
      const m = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const result = m.scaleReal(3);
      expect(result.get(0, 0).real).toBe(3);
      expect(result.get(1, 1).real).toBe(12);
    });
  });

  describe('Matrix Multiplication', () => {
    it('should multiply two 2x2 matrices', () => {
      // [1 2]   [5 6]   [19 22]
      // [3 4] * [7 8] = [43 50]
      const a = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const b = Matrix.fromReal([
        [5, 6],
        [7, 8],
      ]);
      const result = a.multiply(b);
      expect(result.get(0, 0).real).toBe(19);
      expect(result.get(0, 1).real).toBe(22);
      expect(result.get(1, 0).real).toBe(43);
      expect(result.get(1, 1).real).toBe(50);
    });

    it('should multiply non-square matrices', () => {
      // 2x3 * 3x2 = 2x2
      const a = Matrix.fromReal([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      const b = Matrix.fromReal([
        [7, 8],
        [9, 10],
        [11, 12],
      ]);
      const result = a.multiply(b);
      expect(result.rows).toBe(2);
      expect(result.cols).toBe(2);
      expect(result.get(0, 0).real).toBe(58); // 1*7 + 2*9 + 3*11
    });

    it('should throw on invalid dimensions', () => {
      const a = Matrix.zero(2, 3);
      const b = Matrix.zero(2, 3);
      expect(() => a.multiply(b)).toThrow('Invalid dimensions');
    });
  });

  describe('Matrix-Vector Multiplication', () => {
    it('should multiply matrix by vector', () => {
      const m = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const v = [new Complex(1, 0), new Complex(2, 0)];
      const result = m.multiplyVector(v);
      expect(result[0].real).toBe(5); // 1*1 + 2*2
      expect(result[1].real).toBe(11); // 3*1 + 4*2
    });

    it('should throw on mismatched vector length', () => {
      const m = Matrix.zero(2, 2);
      const v = [new Complex(1, 0)];
      expect(() => m.multiplyVector(v)).toThrow('Vector length must match');
    });
  });

  describe('Tensor Product (Kronecker Product)', () => {
    it('should compute tensor product of two matrices', () => {
      // [1 2]   [1 0]   [1 0 2 0]
      // [3 4] ⊗ [0 1] = [0 1 0 2]
      //               [3 0 4 0]
      //               [0 3 0 4]
      const a = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const b = Matrix.identity(2);
      const result = a.tensor(b);
      expect(result.rows).toBe(4);
      expect(result.cols).toBe(4);
      expect(result.get(0, 0).real).toBe(1);
      expect(result.get(0, 2).real).toBe(2);
      expect(result.get(2, 0).real).toBe(3);
      expect(result.get(2, 2).real).toBe(4);
    });

    it('should verify (A⊗B)(C⊗D) = (AC)⊗(BD)', () => {
      const A = Matrix.fromReal([[1, 2], [3, 4]]);
      const B = Matrix.fromReal([[0, 1], [1, 0]]); // X gate
      const C = Matrix.fromReal([[2, 0], [0, 2]]);
      const D = Matrix.fromReal([[1, 1], [1, -1]]);

      const left = A.tensor(B).multiply(C.tensor(D));
      const right = A.multiply(C).tensor(B.multiply(D));

      expect(left.approximatelyEquals(right)).toBe(true);
    });

    it('should compute tensor product of multiple matrices', () => {
      const m1 = Matrix.identity(2);
      const m2 = Matrix.identity(2);
      const m3 = Matrix.identity(2);
      const result = Matrix.tensorProduct(m1, m2, m3);
      expect(result.rows).toBe(8);
      expect(result.cols).toBe(8);
      expect(result.get(0, 0).real).toBe(1);
    });

    it('should throw on empty tensor product', () => {
      expect(() => Matrix.tensorProduct()).toThrow('At least one matrix required');
    });
  });

  describe('Transpose', () => {
    it('should transpose a matrix', () => {
      const m = Matrix.fromReal([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      const result = m.transpose();
      expect(result.rows).toBe(3);
      expect(result.cols).toBe(2);
      expect(result.get(0, 1).real).toBe(4);
      expect(result.get(2, 0).real).toBe(3);
    });

    it('should verify (AB)^T = B^T A^T', () => {
      const A = Matrix.fromReal([[1, 2], [3, 4], [5, 6]]);
      const B = Matrix.fromReal([[1, 2, 3], [4, 5, 6]]);
      const left = A.multiply(B).transpose();
      const right = B.transpose().multiply(A.transpose());
      expect(left.approximatelyEquals(right)).toBe(true);
    });
  });

  describe('Conjugate', () => {
    it('should conjugate a matrix', () => {
      const m = new Matrix([
        [new Complex(1, 2), new Complex(3, 4)],
        [new Complex(5, 6), new Complex(7, 8)],
      ]);
      const result = m.conjugate();
      expect(result.get(0, 0).imag).toBe(-2);
      expect(result.get(1, 1).imag).toBe(-8);
    });
  });

  describe('Adjoint', () => {
    it('should compute adjoint (conjugate transpose)', () => {
      const m = new Matrix([
        [new Complex(1, 2), new Complex(3, 4)],
        [new Complex(5, 6), new Complex(7, 8)],
      ]);
      const result = m.adjoint();
      // Position (0,1) should have conjugate of original (1,0)
      expect(result.get(0, 1).real).toBe(5);
      expect(result.get(0, 1).imag).toBe(-6);
    });

    it('should verify U†U = I for unitary matrix', () => {
      // Hadamard-like matrix
      const h = new Matrix([
        [new Complex(1 / Math.sqrt(2), 0), new Complex(1 / Math.sqrt(2), 0)],
        [new Complex(1 / Math.sqrt(2), 0), new Complex(-1 / Math.sqrt(2), 0)],
      ]);
      const daggerH = h.adjoint();
      const result = daggerH.multiply(h);
      expect(result.isUnitary()).toBe(true);
    });
  });

  describe('Trace', () => {
    it('should compute trace', () => {
      const m = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      const result = m.trace();
      expect(result.real).toBe(5); // 1 + 4
    });

    it('should throw on non-square', () => {
      const m = Matrix.zero(2, 3);
      expect(() => m.trace()).toThrow('Trace is only defined for square matrices');
    });

    it('should verify trace(AB) = trace(BA)', () => {
      const A = Matrix.fromReal([[1, 2], [3, 4]]);
      const B = Matrix.fromReal([[5, 6], [7, 8]]);
      const traceAB = A.multiply(B).trace();
      const traceBA = B.multiply(A).trace();
      expect(traceAB.real).toBe(traceBA.real);
    });
  });

  describe('IsUnitary', () => {
    it('should identify identity as unitary', () => {
      expect(Matrix.identity(2).isUnitary()).toBe(true);
    });

    it('should identify non-unitary matrix', () => {
      const m = Matrix.fromReal([
        [1, 2],
        [3, 4],
      ]);
      expect(m.isUnitary()).toBe(false);
    });

    it('should identify non-square as non-unitary', () => {
      const m = Matrix.zero(2, 3);
      expect(m.isUnitary()).toBe(false);
    });
  });

  describe('Equality', () => {
    it('should check exact equality', () => {
      const a = Matrix.fromReal([[1, 2], [3, 4]]);
      const b = Matrix.fromReal([[1, 2], [3, 4]]);
      const c = Matrix.fromReal([[1, 2], [3, 5]]);
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('should check approximate equality', () => {
      const a = Matrix.fromReal([[1, 2], [3, 4]]);
      const b = new Matrix([
        [new Complex(1.0000000001, 0), new Complex(2, 0)],
        [new Complex(3, 0), new Complex(4, 0)],
      ]);
      expect(a.approximatelyEquals(b, 1e-6)).toBe(true);
      expect(a.approximatelyEquals(b, 1e-15)).toBe(false);
    });

    it('should return false for different dimensions', () => {
      const a = Matrix.zero(2, 2);
      const b = Matrix.zero(2, 3);
      expect(a.equals(b)).toBe(false);
      expect(a.approximatelyEquals(b)).toBe(false);
    });
  });

  describe('Matrix Power', () => {
    it('should compute matrix power', () => {
      const m = Matrix.fromReal([[0, 1], [1, 0]]); // X gate
      const m2 = matrixPower(m, 2);
      expect(m2.isUnitary()).toBe(true);
      // X^2 = I
      expect(m2.approximatelyEquals(Matrix.identity(2))).toBe(true);
    });

    it('should return identity for power 0', () => {
      const m = Matrix.fromReal([[2, 0], [0, 2]]);
      const result = matrixPower(m, 0);
      expect(result.equals(Matrix.identity(2))).toBe(true);
    });

    it('should return same matrix for power 1', () => {
      const m = Matrix.fromReal([[1, 2], [3, 4]]);
      const result = matrixPower(m, 1);
      expect(result.equals(m)).toBe(true);
    });

    it('should throw on negative power', () => {
      const m = Matrix.identity(2);
      expect(() => matrixPower(m, -1)).toThrow('Negative powers not supported');
    });

    it('should throw on non-square', () => {
      const m = Matrix.zero(2, 3);
      expect(() => matrixPower(m, 2)).toThrow('Matrix must be square');
    });
  });

  describe('Controlled Gate', () => {
    it('should create controlled gate', () => {
      const x = Matrix.fromReal([[0, 1], [1, 0]]);
      const cnot = controlledGate(2, x); // 2x2 control space
      expect(cnot.rows).toBe(4);
      expect(cnot.cols).toBe(4);
      // CNOT should swap |11⟩ with |10⟩ (swap is in off-diagonal)
      expect(cnot.get(2, 2).real).toBe(0); // X gate diagonal is 0
      expect(cnot.get(2, 3).real).toBe(1); // X gate swaps
      expect(cnot.get(3, 2).real).toBe(1); // X gate swaps
      expect(cnot.get(3, 3).real).toBe(0); // X gate diagonal is 0
    });

    it('should apply identity to control subspace', () => {
      const gate = Matrix.fromReal([[1, 2], [3, 4]]);
      const controlled = controlledGate(2, gate);
      // Top-left 2x2 should be identity
      expect(controlled.get(0, 0).real).toBe(1);
      expect(controlled.get(1, 1).real).toBe(1);
    });
  });
});
