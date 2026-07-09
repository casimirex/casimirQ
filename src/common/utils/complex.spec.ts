import { Complex, COMPLEX_CONSTANTS } from './complex';

describe('Complex', () => {
  describe('Construction', () => {
    it('should create a complex number with real and imaginary parts', () => {
      const z = new Complex(3, 4);
      expect(z.real).toBe(3);
      expect(z.imag).toBe(4);
    });

    it('should create from static factory method', () => {
      const z = Complex.from(3, 4);
      expect(z.real).toBe(3);
      expect(z.imag).toBe(4);
    });

    it('should create from real only', () => {
      const z = Complex.fromReal(5);
      expect(z.real).toBe(5);
      expect(z.imag).toBe(0);
    });

    it('should create from imaginary only', () => {
      const z = Complex.fromImag(3);
      expect(z.real).toBe(0);
      expect(z.imag).toBe(3);
    });

    it('should have correct constants', () => {
      expect(Complex.I.real).toBe(0);
      expect(Complex.I.imag).toBe(1);
      expect(Complex.ZERO.real).toBe(0);
      expect(Complex.ZERO.imag).toBe(0);
      expect(Complex.ONE.real).toBe(1);
      expect(Complex.ONE.imag).toBe(0);
    });
  });

  describe('Basic Arithmetic', () => {
    it('should add two complex numbers', () => {
      const z1 = new Complex(1, 2);
      const z2 = new Complex(3, 4);
      const result = z1.add(z2);
      expect(result.real).toBe(4);
      expect(result.imag).toBe(6);
    });

    it('should be immutable when adding', () => {
      const z1 = new Complex(1, 2);
      const z2 = new Complex(3, 4);
      z1.add(z2);
      expect(z1.real).toBe(1);
      expect(z1.imag).toBe(2);
    });

    it('should subtract two complex numbers', () => {
      const z1 = new Complex(5, 7);
      const z2 = new Complex(2, 3);
      const result = z1.sub(z2);
      expect(result.real).toBe(3);
      expect(result.imag).toBe(4);
    });

    it('should multiply two complex numbers', () => {
      // (1 + 2i) * (3 + 4i) = (1*3 - 2*4) + (1*4 + 2*3)i = -5 + 10i
      const z1 = new Complex(1, 2);
      const z2 = new Complex(3, 4);
      const result = z1.multiply(z2);
      expect(result.real).toBe(-5);
      expect(result.imag).toBe(10);
    });

    it('should verify i * i = -1', () => {
      const i = Complex.I;
      const result = i.multiply(i);
      expect(result.real).toBe(-1);
      expect(result.imag).toBe(0);
    });

    it('should scale by a real number', () => {
      const z = new Complex(3, 4);
      const result = z.scale(2);
      expect(result.real).toBe(6);
      expect(result.imag).toBe(8);
    });
  });

  describe('Division', () => {
    it('should divide two complex numbers', () => {
      // (5 + 10i) / (1 + 2i) = 5
      const z1 = new Complex(5, 10);
      const z2 = new Complex(1, 2);
      const result = z1.divide(z2);
      expect(result.real).toBeCloseTo(5, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should throw on division by zero', () => {
      const z1 = new Complex(1, 2);
      const z2 = new Complex(0, 0);
      expect(() => z1.divide(z2)).toThrow('Division by zero');
    });

    it('should verify 1 / i = -i', () => {
      const one = Complex.ONE;
      const i = Complex.I;
      const result = one.divide(i);
      expect(result.real).toBeCloseTo(0, 10);
      expect(result.imag).toBeCloseTo(-1, 10);
    });
  });

  describe('Complex Conjugate', () => {
    it('should compute conjugate', () => {
      const z = new Complex(3, 4);
      const result = z.conjugate();
      expect(result.real).toBe(3);
      expect(result.imag).toBe(-4);
    });

    it('should verify z * z* is real', () => {
      const z = new Complex(3, 4);
      const result = z.multiply(z.conjugate());
      expect(result.imag).toBe(0);
      expect(result.real).toBe(25); // |z|² = 3² + 4²
    });
  });

  describe('Magnitude', () => {
    it('should compute magnitude squared', () => {
      const z = new Complex(3, 4);
      expect(z.magnitudeSquared()).toBe(25);
    });

    it('should compute magnitude', () => {
      const z = new Complex(3, 4);
      expect(z.magnitude()).toBe(5);
    });

    it('should have |i| = 1', () => {
      expect(Complex.I.magnitude()).toBe(1);
    });

    it('should have |1| = 1', () => {
      expect(Complex.ONE.magnitude()).toBe(1);
    });
  });

  describe('Phase', () => {
    it('should compute phase of 1', () => {
      const z = new Complex(1, 0);
      expect(z.phase()).toBe(0);
    });

    it('should compute phase of i', () => {
      const z = new Complex(0, 1);
      expect(z.phase()).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should compute phase of -1', () => {
      const z = new Complex(-1, 0);
      expect(z.phase()).toBeCloseTo(Math.PI, 10);
    });

    it('should compute phase of -i', () => {
      const z = new Complex(0, -1);
      expect(z.phase()).toBeCloseTo(-Math.PI / 2, 10);
    });
  });

  describe('Exponential', () => {
    it('should compute e^0 = 1', () => {
      const z = new Complex(0, 0);
      const result = z.exp();
      expect(result.real).toBeCloseTo(1, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should verify e^(iπ) = -1 (Euler identity)', () => {
      const iPi = new Complex(0, Math.PI);
      const result = iPi.exp();
      expect(result.real).toBeCloseTo(-1, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should verify e^(iπ/2) = i', () => {
      const iPiOver2 = new Complex(0, Math.PI / 2);
      const result = iPiOver2.exp();
      expect(result.real).toBeCloseTo(0, 10);
      expect(result.imag).toBeCloseTo(1, 10);
    });

    it('should compute e^1 = e', () => {
      const z = new Complex(1, 0);
      const result = z.exp();
      expect(result.real).toBeCloseTo(Math.E, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });
  });

  describe('Logarithm', () => {
    it('should compute ln(1) = 0', () => {
      const z = new Complex(1, 0);
      const result = z.log();
      expect(result.real).toBeCloseTo(0, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should compute ln(i) = iπ/2', () => {
      const z = new Complex(0, 1);
      const result = z.log();
      expect(result.real).toBeCloseTo(0, 10);
      expect(result.imag).toBeCloseTo(Math.PI / 2, 10);
    });

    it('should verify exp(log(z)) = z', () => {
      const z = new Complex(3, 4);
      const result = z.log().exp();
      expect(result.real).toBeCloseTo(z.real, 10);
      expect(result.imag).toBeCloseTo(z.imag, 10);
    });
  });

  describe('Power', () => {
    it('should compute z^1 = z', () => {
      const z = new Complex(3, 4);
      const result = z.pow(Complex.ONE);
      expect(result.real).toBeCloseTo(z.real, 10);
      expect(result.imag).toBeCloseTo(z.imag, 10);
    });

    it('should compute z^0 = 1', () => {
      const z = new Complex(3, 4);
      const result = z.pow(Complex.ZERO);
      expect(result.real).toBeCloseTo(1, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should compute i^2 = -1', () => {
      const i = Complex.I;
      const result = i.pow(new Complex(2, 0));
      expect(result.real).toBeCloseTo(-1, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should compute i^i = e^(-π/2)', () => {
      const i = Complex.I;
      const result = i.pow(i);
      const expected = Math.exp(-Math.PI / 2);
      expect(result.real).toBeCloseTo(expected, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });
  });

  describe('Square Root', () => {
    it('should compute sqrt(1) = 1', () => {
      const z = new Complex(1, 0);
      const result = z.sqrt();
      expect(result.real).toBeCloseTo(1, 10);
      expect(result.imag).toBeCloseTo(0, 10);
    });

    it('should compute sqrt(-1) = i', () => {
      const z = new Complex(-1, 0);
      const result = z.sqrt();
      expect(result.real).toBeCloseTo(0, 10);
      expect(result.imag).toBeCloseTo(1, 10);
    });

    it('should verify sqrt(z) * sqrt(z) = z', () => {
      const z = new Complex(3, 4);
      const sqrt = z.sqrt();
      const result = sqrt.multiply(sqrt);
      expect(result.real).toBeCloseTo(z.real, 10);
      expect(result.imag).toBeCloseTo(z.imag, 10);
    });
  });

  describe('Equality', () => {
    it('should check exact equality', () => {
      const z1 = new Complex(3, 4);
      const z2 = new Complex(3, 4);
      const z3 = new Complex(3, 5);
      expect(z1.equals(z2)).toBe(true);
      expect(z1.equals(z3)).toBe(false);
    });

    it('should check approximate equality', () => {
      const z1 = new Complex(1, 2);
      const z2 = new Complex(1.0000000001, 2.0000000001);
      expect(z1.approximatelyEquals(z2, 1e-6)).toBe(true);
      expect(z1.approximatelyEquals(z2, 1e-15)).toBe(false);
    });

    it('should check isZero', () => {
      expect(new Complex(0, 0).isZero()).toBe(true);
      expect(new Complex(1, 0).isZero()).toBe(false);
      expect(new Complex(0, 1).isZero()).toBe(false);
    });

    it('should check isReal', () => {
      expect(new Complex(5, 0).isReal()).toBe(true);
      expect(new Complex(0, 5).isReal()).toBe(false);
      expect(new Complex(3, 4).isReal()).toBe(false);
    });

    it('should check isImaginary', () => {
      expect(new Complex(0, 5).isImaginary()).toBe(true);
      expect(new Complex(5, 0).isImaginary()).toBe(false);
      expect(new Complex(3, 4).isImaginary()).toBe(false);
    });
  });

  describe('String Representation', () => {
    it('should convert real number to string', () => {
      const z = new Complex(5, 0);
      expect(z.toString()).toBe('5');
    });

    it('should convert imaginary number to string', () => {
      const z = new Complex(0, 3);
      expect(z.toString()).toBe('3i');
    });

    it('should convert complex number to string', () => {
      const z = new Complex(3, 4);
      expect(z.toString()).toBe('3 + 4i');
    });

    it('should handle negative imaginary part', () => {
      const z = new Complex(3, -4);
      expect(z.toString()).toBe('3 - 4i');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON', () => {
      const z = new Complex(3, 4);
      const json = z.toJSON();
      expect(json).toEqual({ real: 3, imag: 4 });
    });

    it('should deserialize from JSON', () => {
      const json = { real: 3, imag: 4 };
      const z = Complex.fromJSON(json);
      expect(z.real).toBe(3);
      expect(z.imag).toBe(4);
    });

    it('should be round-trip serializable', () => {
      const z = new Complex(3, 4);
      const json = z.toJSON();
      const restored = Complex.fromJSON(json);
      expect(restored.equals(z)).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should have all COMPLEX_CONSTANTS defined', () => {
      expect(COMPLEX_CONSTANTS.ZERO.real).toBe(0);
      expect(COMPLEX_CONSTANTS.ONE.real).toBe(1);
      expect(COMPLEX_CONSTANTS.I.imag).toBe(1);
      expect(COMPLEX_CONSTANTS.MINUS_ONE.real).toBe(-1);
      expect(COMPLEX_CONSTANTS.MINUS_I.imag).toBe(-1);
      expect(COMPLEX_CONSTANTS.SQRT2.real).toBe(Math.SQRT2);
      expect(COMPLEX_CONSTANTS.INV_SQRT2.real).toBe(1 / Math.SQRT2);
      expect(COMPLEX_CONSTANTS.PI.real).toBe(Math.PI);
      expect(COMPLEX_CONSTANTS.E.real).toBe(Math.E);
    });
  });
});
