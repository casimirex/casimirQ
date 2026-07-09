/**
 * Matrix operations for quantum computing
 *
 * Represents matrices of complex numbers with support for:
 * - Basic matrix operations (addition, multiplication)
 * - Tensor products (Kronecker product) for multi-qubit gates
 * - Adjoint (conjugate transpose) for unitary verification
 * - Identity and zero matrix generation
 *
 * All operations are immutable - they return new Matrix instances.
 */

import { Complex } from './complex';

export class Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: Complex[][];

  /**
   * Create a matrix from a 2D array of Complex numbers
   */
  constructor(data: Complex[][]) {
    if (data.length === 0 || data[0].length === 0) {
      throw new Error('Matrix must have at least 1 row and 1 column');
    }
    this.rows = data.length;
    this.cols = data[0].length;

    // Validate all rows have the same length
    for (let i = 0; i < this.rows; i++) {
      if (data[i].length !== this.cols) {
        throw new Error('All rows must have the same number of columns');
      }
    }

    // Deep copy the data to ensure immutability
    this.data = data.map(row => [...row]);
  }

  /**
   * Create a matrix from real number array
   */
  static fromReal(data: number[][]): Matrix {
    return new Matrix(data.map(row => row.map(val => new Complex(val, 0))));
  }

  /**
   * Create a matrix from complex number tuples [real, imag]
   */
  static fromTuples(data: [number, number][][]): Matrix {
    return new Matrix(data.map(row => row.map(([r, i]) => new Complex(r, i))));
  }

  /**
   * Create an identity matrix of size n x n
   */
  static identity(n: number): Matrix {
    const data: Complex[][] = [];
    for (let i = 0; i < n; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < n; j++) {
        row.push(i === j ? new Complex(1, 0) : new Complex(0, 0));
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Create a zero matrix of size rows x cols
   */
  static zero(rows: number, cols: number): Matrix {
    const data: Complex[][] = [];
    for (let i = 0; i < rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < cols; j++) {
        row.push(new Complex(0, 0));
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Create a zero matrix with the same dimensions as this matrix
   */
  zerosLike(): Matrix {
    return Matrix.zero(this.rows, this.cols);
  }

  /**
   * Create an identity matrix with the same dimensions (must be square)
   */
  identityLike(): Matrix {
    if (this.rows !== this.cols) {
      throw new Error('Identity matrix must be square');
    }
    return Matrix.identity(this.rows);
  }

  /**
   * Get element at position (row, col)
   */
  get(row: number, col: number): Complex {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      throw new Error('Index out of bounds');
    }
    return this.data[row][col];
  }

  /**
   * Set element at position (row, col) - returns new matrix
   */
  set(row: number, col: number, value: Complex): Matrix {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      throw new Error('Index out of bounds');
    }
    const newData = this.data.map(r => [...r]);
    newData[row][col] = value;
    return new Matrix(newData);
  }

  /**
   * Add two matrices element-wise
   */
  add(other: Matrix): Matrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error('Matrices must have the same dimensions for addition');
    }
    const data: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].add(other.data[i][j]));
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Subtract two matrices element-wise
   */
  sub(other: Matrix): Matrix {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error('Matrices must have the same dimensions for subtraction');
    }
    const data: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].sub(other.data[i][j]));
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Scale matrix by a complex scalar
   */
  scale(scalar: Complex): Matrix {
    const data: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].multiply(scalar));
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Scale matrix by a real scalar
   */
  scaleReal(scalar: number): Matrix {
    const data: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].scale(scalar));
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Multiply two matrices
   */
  multiply(other: Matrix): Matrix {
    if (this.cols !== other.rows) {
      throw new Error('Invalid dimensions for matrix multiplication');
    }
    const data: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < other.cols; j++) {
        let sum = new Complex(0, 0);
        for (let k = 0; k < this.cols; k++) {
          sum = sum.add(this.data[i][k].multiply(other.data[k][j]));
        }
        row.push(sum);
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Multiply matrix by vector (treating vector as column vector)
   */
  multiplyVector(vector: Complex[]): Complex[] {
    if (vector.length !== this.cols) {
      throw new Error('Vector length must match matrix columns');
    }
    const result: Complex[] = [];
    for (let i = 0; i < this.rows; i++) {
      let sum = new Complex(0, 0);
      for (let j = 0; j < this.cols; j++) {
        sum = sum.add(this.data[i][j].multiply(vector[j]));
      }
      result.push(sum);
    }
    return result;
  }

  /**
   * Tensor product (Kronecker product) of two matrices
   * Essential for multi-qubit gate construction
   */
  tensor(other: Matrix): Matrix {
    const newRows = this.rows * other.rows;
    const newCols = this.cols * other.cols;
    const data: Complex[][] = [];

    for (let i = 0; i < this.rows; i++) {
      for (let k = 0; k < other.rows; k++) {
        const row: Complex[] = [];
        for (let j = 0; j < this.cols; j++) {
          for (let l = 0; l < other.cols; l++) {
            row.push(this.data[i][j].multiply(other.data[k][l]));
          }
        }
        data.push(row);
      }
    }
    return new Matrix(data);
  }

  /**
   * Compute the tensor product of multiple matrices
   */
  static tensorProduct(...matrices: Matrix[]): Matrix {
    if (matrices.length === 0) {
      throw new Error('At least one matrix required');
    }
    return matrices.reduce((acc, m) => acc.tensor(m));
  }

  /**
   * Transpose of the matrix
   */
  transpose(): Matrix {
    const data: Complex[][] = [];
    for (let j = 0; j < this.cols; j++) {
      const row: Complex[] = [];
      for (let i = 0; i < this.rows; i++) {
        row.push(this.data[i][j]);
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Conjugate of the matrix (element-wise conjugation)
   */
  conjugate(): Matrix {
    const data: Complex[][] = [];
    for (let i = 0; i < this.rows; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < this.cols; j++) {
        row.push(this.data[i][j].conjugate());
      }
      data.push(row);
    }
    return new Matrix(data);
  }

  /**
   * Adjoint (conjugate transpose) of the matrix
   * Essential for unitary verification: U†U = I
   */
  adjoint(): Matrix {
    return this.transpose().conjugate();
  }

  /**
   * Trace of the matrix (sum of diagonal elements)
   * Must be square matrix
   */
  trace(): Complex {
    if (this.rows !== this.cols) {
      throw new Error('Trace is only defined for square matrices');
    }
    let sum = new Complex(0, 0);
    for (let i = 0; i < this.rows; i++) {
      sum = sum.add(this.data[i][i]);
    }
    return sum;
  }

  /**
   * Compute U†U to verify if matrix is unitary
   * Should be identity for unitary matrices
   */
  isUnitary(tolerance: number = 1e-10): boolean {
    if (this.rows !== this.cols) {
      return false;
    }
    const daggerU = this.adjoint().multiply(this);
    const identity = Matrix.identity(this.rows);
    return daggerU.approximatelyEquals(identity, tolerance);
  }

  /**
   * Check if matrix is approximately equal to another
   */
  approximatelyEquals(other: Matrix, tolerance: number = 1e-10): boolean {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      return false;
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (!this.data[i][j].approximatelyEquals(other.data[i][j], tolerance)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if matrix equals another exactly
   */
  equals(other: Matrix): boolean {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      return false;
    }
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (!this.data[i][j].equals(other.data[i][j])) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * String representation
   */
  toString(): string {
    const rows = this.data.map(row =>
      row.map(c => `(${c.toString()})`).join(' ')
    );
    return '[' + rows.join('\n ') + ']';
  }

  /**
   * Get raw data (shallow copy of rows)
   */
  toArray(): Complex[][] {
    return this.data.map(row => [...row]);
  }
}

/**
 * Matrix power (matrix raised to an integer power)
 */
export function matrixPower(matrix: Matrix, n: number): Matrix {
  if (matrix.rows !== matrix.cols) {
    throw new Error('Matrix must be square for power operation');
  }
  if (n < 0) {
    throw new Error('Negative powers not supported');
  }
  if (n === 0) {
    return Matrix.identity(matrix.rows);
  }
  if (n === 1) {
    return matrix;
  }

  let result = matrix;
  for (let i = 1; i < n; i++) {
    result = result.multiply(matrix);
  }
  return result;
}

/**
 * Create a controlled gate matrix
 * @param controlSize Size of control register (2^n for n control qubits)
 * @param gate The gate to control
 */
export function controlledGate(controlSize: number, gate: Matrix): Matrix {
  const dim = controlSize * gate.rows;
  const data: Complex[][] = [];

  for (let i = 0; i < dim; i++) {
    const row: Complex[] = [];
    for (let j = 0; j < dim; j++) {
      row.push(new Complex(0, 0));
    }
    data.push(row);
  }

  // Identity on non-control part
  for (let i = 0; i < dim - gate.rows; i++) {
    data[i][i] = new Complex(1, 0);
  }

  // Gate on control part (bottom-right block)
  for (let i = 0; i < gate.rows; i++) {
    for (let j = 0; j < gate.cols; j++) {
      data[dim - gate.rows + i][dim - gate.cols + j] = gate.data[i][j];
    }
  }

  return new Matrix(data);
}
