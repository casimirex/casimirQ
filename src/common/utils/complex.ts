/**
 * Complex number implementation for quantum computing
 *
 * Represents complex numbers in the form a + bi where:
 * - a is the real part
 * - b is the imaginary part
 * - i is the imaginary unit (i² = -1)
 *
 * All operations are immutable - they return new Complex instances.
 */
export class Complex {
  constructor(
    public readonly real: number,
    public readonly imag: number,
  ) {}

  /**
   * Alias for real part
   */
  get re(): number {
    return this.real;
  }

  /**
   * Alias for imaginary part
   */
  get im(): number {
    return this.imag;
  }

  /**
   * Create a complex number from real and imaginary parts
   */
  static from(real: number, imag: number): Complex {
    return new Complex(real, imag);
  }

  /**
   * Create a complex number from real only (imaginary part = 0)
   */
  static fromReal(real: number): Complex {
    return new Complex(real, 0);
  }

  /**
   * Create a complex number from imaginary only (real part = 0)
   */
  static fromImag(imag: number): Complex {
    return new Complex(0, imag);
  }

  /**
   * The imaginary unit i (0 + 1i)
   */
  static readonly I = new Complex(0, 1);

  /**
   * Complex zero (0 + 0i)
   */
  static readonly ZERO = new Complex(0, 0);

  /**
   * Complex one (1 + 0i)
   */
  static readonly ONE = new Complex(1, 0);

  /**
   * Add two complex numbers
   * (a + bi) + (c + di) = (a + c) + (b + d)i
   */
  add(other: Complex): Complex {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }

  /**
   * Subtract two complex numbers
   * (a + bi) - (c + di) = (a - c) + (b - d)i
   */
  sub(other: Complex): Complex {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }

  /**
   * Multiply two complex numbers
   * (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
   */
  multiply(other: Complex): Complex {
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real,
    );
  }

  /**
   * Divide by another complex number
   * (a + bi) / (c + di) = ((a + bi)(c - di)) / (c² + d²)
   */
  divide(other: Complex): Complex {
    const denominator = other.real * other.real + other.imag * other.imag;
    if (denominator === 0) {
      throw new Error('Division by zero');
    }
    return new Complex(
      (this.real * other.real + this.imag * other.imag) / denominator,
      (this.imag * other.real - this.real * other.imag) / denominator,
    );
  }

  /**
   * Scale by a real number
   */
  scale(factor: number): Complex {
    return new Complex(this.real * factor, this.imag * factor);
  }

  /**
   * Complex conjugate: (a + bi)* = (a - bi)
   */
  conjugate(): Complex {
    return new Complex(this.real, -this.imag);
  }

  /**
   * Magnitude squared: |z|² = a² + b²
   * (Faster than magnitude as it avoids square root)
   */
  magnitudeSquared(): number {
    return this.real * this.real + this.imag * this.imag;
  }

  /**
   * Magnitude (absolute value): |z| = √(a² + b²)
   */
  magnitude(): number {
    return Math.sqrt(this.magnitudeSquared());
  }

  /**
   * Phase/argument: θ = atan2(b, a)
   */
  phase(): number {
    return Math.atan2(this.imag, this.real);
  }

  /**
   * Complex exponential: e^z = e^(a+bi) = e^a * (cos(b) + i*sin(b))
   */
  exp(): Complex {
    const expReal = Math.exp(this.real);
    return new Complex(expReal * Math.cos(this.imag), expReal * Math.sin(this.imag));
  }

  /**
   * Natural logarithm: ln(z) = ln(|z|) + i*arg(z)
   */
  log(): Complex {
    return new Complex(Math.log(this.magnitude()), this.phase());
  }

  /**
   * Power: z^w = exp(w * ln(z))
   */
  pow(exponent: Complex): Complex {
    return this.log().multiply(exponent).exp();
  }

  /**
   * Square root: √z = z^(1/2)
   */
  sqrt(): Complex {
    const magnitude = this.magnitude();
    const phase = this.phase() / 2;
    const sqrtMag = Math.sqrt(magnitude);
    return new Complex(sqrtMag * Math.cos(phase), sqrtMag * Math.sin(phase));
  }

  /**
   * Check if approximately equal to another complex number
   * within a given tolerance
   */
  approximatelyEquals(other: Complex, tolerance: number = 1e-10): boolean {
    return (
      Math.abs(this.real - other.real) < tolerance && Math.abs(this.imag - other.imag) < tolerance
    );
  }

  /**
   * Check if equal to another complex number (exact)
   */
  equals(other: Complex): boolean {
    return this.real === other.real && this.imag === other.imag;
  }

  /**
   * Check if this complex number is zero
   */
  isZero(): boolean {
    return this.real === 0 && this.imag === 0;
  }

  /**
   * Check if this complex number is purely real
   */
  isReal(): boolean {
    return this.imag === 0;
  }

  /**
   * Check if this complex number is purely imaginary
   */
  isImaginary(): boolean {
    return this.real === 0;
  }

  /**
   * Return a string representation
   */
  toString(): string {
    if (this.imag === 0) return `${this.real}`;
    if (this.real === 0) return `${this.imag}i`;
    const sign = this.imag >= 0 ? '+' : '-';
    return `${this.real} ${sign} ${Math.abs(this.imag)}i`;
  }

  /**
   * Return a JSON-serializable representation
   */
  toJSON(): { real: number; imag: number } {
    return { real: this.real, imag: this.imag };
  }

  /**
   * Create a Complex from a JSON representation
   */
  static fromJSON(json: { real: number; imag: number }): Complex {
    return new Complex(json.real, json.imag);
  }
}

/**
 * Common complex constants
 */
export const COMPLEX_CONSTANTS = {
  ZERO: Complex.ZERO,
  ONE: Complex.ONE,
  I: Complex.I,
  MINUS_ONE: new Complex(-1, 0),
  MINUS_I: new Complex(0, -1),
  SQRT2: new Complex(Math.SQRT2, 0),
  INV_SQRT2: new Complex(1 / Math.SQRT2, 0),
  PI: new Complex(Math.PI, 0),
  E: new Complex(Math.E, 0),
} as const;
