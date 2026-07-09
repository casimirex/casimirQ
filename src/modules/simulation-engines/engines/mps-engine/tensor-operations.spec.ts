import { Tensor3, Tensor4, truncateSingularValues, entanglementEntropy } from './tensor-operations';
import { Complex } from '../../../../common/utils/complex';

describe('TensorOperations', () => {
  describe('Tensor3 Creation', () => {
    it('should create identity tensor', () => {
      const tensor = Tensor3.identity(2);
      expect(tensor).toBeDefined();
      expect(tensor.dPhys).toBe(2);
      expect(tensor.dLeft).toBe(1);
      expect(tensor.dRight).toBe(1);
    });

    it('should create zero tensor', () => {
      const tensor = Tensor3.zeros(2, 4, 4);
      expect(tensor).toBeDefined();
      expect(tensor.dPhys).toBe(2);
      expect(tensor.dLeft).toBe(4);
      expect(tensor.dRight).toBe(4);
    });

    it('should get and set elements', () => {
      const tensor = Tensor3.zeros(2, 3, 4);
      const value = new Complex(1, 2);
      tensor.set(1, 2, 3, value);
      expect(tensor.get(1, 2, 3)).toEqual(value);
    });
  });

  describe('Tensor Reshape', () => {
    it('should reshape tensor to matrix', () => {
      const tensor = Tensor3.zeros(2, 3, 4);
      const result = tensor.reshapeToMatrix();
      expect(result).toBeDefined();
      expect(result.rows).toBe(6);
      expect(result.cols).toBe(4);
    });

    it('should reconstruct tensor from matrix', () => {
      const matrix: Complex[][] = [
        [new Complex(1, 0), new Complex(0, 0)],
        [new Complex(0, 0), new Complex(1, 0)],
      ];
      const tensor = Tensor3.fromMatrix(matrix, 1, 2, 2);
      expect(tensor).toBeDefined();
      expect(tensor.dPhys).toBe(1);
      expect(tensor.dLeft).toBe(2);
      expect(tensor.dRight).toBe(2);
    });
  });

  describe('Tensor Contraction', () => {
    it('should contract two tensors', () => {
      const tensorA = Tensor3.zeros(2, 3, 4);
      const tensorB = Tensor3.zeros(2, 4, 5);
      const result = tensorA.contractRight(tensorB);
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Tensor4);
    });

    it('should throw error on dimension mismatch', () => {
      const tensorA = Tensor3.zeros(2, 3, 4);
      const tensorB = Tensor3.zeros(2, 5, 6);
      expect(() => tensorA.contractRight(tensorB)).toThrow('Bond dimensions do not match');
    });
  });

  describe('Tensor4 Operations', () => {
    it('should reshape 4-way tensor to matrix', () => {
      const data: Complex[][][][] = [[[[new Complex(1, 0)]]]];
      const tensor = new Tensor4(data, 1, 1, 1, 1);
      const result = tensor.reshapeToMatrix();
      expect(result).toBeDefined();
      expect(result.rows).toBe(1);
      expect(result.cols).toBe(1);
    });

    it('should split 4-way tensor', () => {
      const data: Complex[][][][] = [];
      for (let i = 0; i < 2; i++) {
        const ijSlice: Complex[][][] = [];
        for (let j = 0; j < 2; j++) {
          const alphaSlice: Complex[][] = [];
          for (let alpha = 0; alpha < 2; alpha++) {
            const betaSlice: Complex[] = [];
            for (let beta = 0; beta < 4; beta++) {
              betaSlice.push(new Complex(1, 0));
            }
            alphaSlice.push(betaSlice);
          }
          ijSlice.push(alphaSlice);
        }
        data.push(ijSlice);
      }
      const tensor = new Tensor4(data, 2, 2, 2, 4);
      const [left, right, singularValues] = tensor.split(8);
      expect(left).toBeDefined();
      expect(right).toBeDefined();
      expect(singularValues).toBeDefined();
    });
  });

  describe('SVD Truncation', () => {
    it('should truncate singular values', () => {
      const values = [1.0, 0.5, 0.1, 0.01, 0.001];
      const truncated = truncateSingularValues(values, 3);
      expect(truncated.length).toBeLessThanOrEqual(3);
    });

    it('should filter small values', () => {
      const values = [1.0, 0.5, 1e-15, 1e-20];
      const truncated = truncateSingularValues(values, 10);
      expect(truncated.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty array', () => {
      const values: number[] = [];
      const truncated = truncateSingularValues(values, 5);
      expect(truncated).toEqual([]);
    });
  });

  describe('Entanglement Entropy', () => {
    it('should calculate entropy from singular values', () => {
      const values = [Math.sqrt(0.5), Math.sqrt(0.5)];
      const entropy = entanglementEntropy(values);
      expect(entropy).toBeGreaterThan(0);
    });

    it('should return 0 for single value', () => {
      const values = [1.0];
      const entropy = entanglementEntropy(values);
      expect(entropy).toBe(0);
    });

    it('should handle max entanglement', () => {
      // Bell state has 2 equal singular values of 1/sqrt(2)
      const values = [Math.sqrt(0.5), Math.sqrt(0.5)];
      const entropy = entanglementEntropy(values);
      expect(entropy).toBeCloseTo(Math.log(2), 5);
    });

    it('should handle no entanglement', () => {
      const values = [1.0, 0.0];
      const entropy = entanglementEntropy(values);
      expect(entropy).toBe(0);
    });
  });

  describe('Tensor Scaling and Norm', () => {
    it('should scale tensor by complex number', () => {
      const tensor = Tensor3.identity(2);
      const scaled = tensor.scale(new Complex(2, 0));
      expect(scaled).toBeDefined();
    });

    it('should calculate tensor norm', () => {
      const tensor = Tensor3.identity(2);
      const norm = tensor.norm();
      expect(norm).toBeGreaterThan(0);
    });

    it('should have norm of zero tensor equal to zero', () => {
      const tensor = Tensor3.zeros(2, 3, 4);
      const norm = tensor.norm();
      expect(norm).toBe(0);
    });

    it('should have norm of identity equal to sqrt(2)', () => {
      const tensor = Tensor3.identity(2);
      const norm = tensor.norm();
      expect(norm).toBeCloseTo(Math.sqrt(2), 5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-element tensor', () => {
      const tensor = Tensor3.zeros(1, 1, 1);
      expect(tensor).toBeDefined();
      expect(tensor.norm()).toBe(0);
    });

    it('should handle large dimension tensor', () => {
      const tensor = Tensor3.zeros(10, 10, 10);
      expect(tensor).toBeDefined();
      const result = tensor.reshapeToMatrix();
      expect(result.rows).toBe(100);
      expect(result.cols).toBe(10);
    });

    it('should handle rectangular tensors', () => {
      const tensor = Tensor3.zeros(2, 5, 10);
      const result = tensor.reshapeToMatrix();
      expect(result.rows).toBe(10);
      expect(result.cols).toBe(10);
    });
  });
});
