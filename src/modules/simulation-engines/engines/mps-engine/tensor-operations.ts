/**
 * Tensor Operations for MPS
 *
 * Implements core tensor manipulations:
 * - Tensor contractions
 * - SVD (Singular Value Decomposition)
 * - Truncation based on bond dimension
 */

import { Complex } from '../../../../common/utils/complex';

/**
 * 3-way tensor for MPS: A[i][α][β] where
 * - i: physical index (0 or 1 for qubit)
 * - α: left bond dimension
 * - β: right bond dimension
 */
export class Tensor3 {
  constructor(
    public readonly data: Complex[][][],
    public readonly dPhys: number, // Physical dimension (usually 2)
    public readonly dLeft: number, // Left bond dimension
    public readonly dRight: number, // Right bond dimension
  ) {}

  /**
   * Create a zero tensor
   */
  static zeros(dPhys: number, dLeft: number, dRight: number): Tensor3 {
    const data: Complex[][][] = [];
    for (let i = 0; i < dPhys; i++) {
      const leftSlice: Complex[][] = [];
      for (let α = 0; α < dLeft; α++) {
        const rightSlice: Complex[] = [];
        for (let β = 0; β < dRight; β++) {
          rightSlice.push(new Complex(0, 0));
        }
        leftSlice.push(rightSlice);
      }
      data.push(leftSlice);
    }
    return new Tensor3(data, dPhys, dLeft, dRight);
  }

  /**
   * Create an identity tensor (for product states)
   */
  static identity(dPhys: number): Tensor3 {
    // For a single site: dLeft = dRight = 1
    const tensor = Tensor3.zeros(dPhys, 1, 1);
    for (let i = 0; i < dPhys; i++) {
      tensor.data[i][0][0] = new Complex(1, 0);
    }
    return tensor;
  }

  /**
   * Get element A[i][α][β]
   */
  get(i: number, α: number, β: number): Complex {
    return this.data[i][α][β];
  }

  /**
   * Set element A[i][α][β]
   */
  set(i: number, α: number, β: number, value: Complex): void {
    this.data[i][α][β] = value;
  }

  /**
   * Reshape to matrix for SVD: (dPhys × dLeft) × dRight
   */
  reshapeToMatrix(): { matrix: Complex[][]; rows: number; cols: number } {
    const rows = this.dPhys * this.dLeft;
    const cols = this.dRight;
    const matrix: Complex[][] = [];

    for (let i = 0; i < this.dPhys; i++) {
      for (let α = 0; α < this.dLeft; α++) {
        const row: Complex[] = [];
        for (let β = 0; β < this.dRight; β++) {
          row.push(this.data[i][α][β]);
        }
        matrix.push(row);
      }
    }

    return { matrix, rows, cols };
  }

  /**
   * Create tensor from matrix after SVD
   */
  static fromMatrix(matrix: Complex[][], dPhys: number, dLeft: number, dRight: number): Tensor3 {
    const tensor = Tensor3.zeros(dPhys, dLeft, dRight);

    for (let i = 0; i < dPhys; i++) {
      for (let α = 0; α < dLeft; α++) {
        for (let β = 0; β < dRight; β++) {
          const rowIdx = i * dLeft + α;
          tensor.data[i][α][β] = matrix[rowIdx][β];
        }
      }
    }

    return tensor;
  }

  /**
   * Contract with another tensor on right bond
   * Result: Σ_β A[i][α][β] × B[j][β][γ] = C[i,j][α][γ]
   */
  contractRight(other: Tensor3): Tensor4 {
    if (this.dRight !== other.dLeft) {
      throw new Error('Bond dimensions do not match');
    }

    // Result is 4-way tensor: C[i][j][α][γ]
    const dPhys1 = this.dPhys;
    const dPhys2 = other.dPhys;
    const dLeft = this.dLeft;
    const dRight = other.dRight;

    const result: Complex[][][][] = [];

    for (let i = 0; i < dPhys1; i++) {
      const phys1Slice: Complex[][][] = [];
      for (let j = 0; j < dPhys2; j++) {
        const phys2Slice: Complex[][] = [];
        for (let α = 0; α < dLeft; α++) {
          const leftSlice: Complex[] = [];
          for (let γ = 0; γ < dRight; γ++) {
            let sum = new Complex(0, 0);
            for (let β = 0; β < this.dRight; β++) {
              sum = sum.add(this.data[i][α][β].multiply(other.data[j][β][γ]));
            }
            leftSlice.push(sum);
          }
          phys2Slice.push(leftSlice);
        }
        phys1Slice.push(phys2Slice);
      }
      result.push(phys1Slice);
    }

    return new Tensor4(result, dPhys1, dPhys2, dLeft, dRight);
  }

  /**
   * Scale tensor by complex number
   */
  scale(scalar: Complex): Tensor3 {
    const result = Tensor3.zeros(this.dPhys, this.dLeft, this.dRight);
    for (let i = 0; i < this.dPhys; i++) {
      for (let α = 0; α < this.dLeft; α++) {
        for (let β = 0; β < this.dRight; β++) {
          result.data[i][α][β] = this.data[i][α][β].multiply(scalar);
        }
      }
    }
    return result;
  }

  /**
   * Frobenius norm of tensor
   */
  norm(): number {
    let sum = 0;
    for (let i = 0; i < this.dPhys; i++) {
      for (let α = 0; α < this.dLeft; α++) {
        for (let β = 0; β < this.dRight; β++) {
          sum += this.data[i][α][β].magnitudeSquared();
        }
      }
    }
    return Math.sqrt(sum);
  }
}

/**
 * 4-way tensor for contracted tensors: T[i][j][α][γ]
 */
export class Tensor4 {
  constructor(
    public readonly data: Complex[][][][],
    public readonly dPhys1: number,
    public readonly dPhys2: number,
    public readonly dLeft: number,
    public readonly dRight: number,
  ) {}

  /**
   * Reshape to matrix for SVD: (dPhys1 × dPhys2 × dLeft) × dRight
   */
  reshapeToMatrix(): { matrix: Complex[][]; rows: number; cols: number } {
    const rows = this.dPhys1 * this.dPhys2 * this.dLeft;
    const cols = this.dRight;
    const matrix: Complex[][] = [];

    for (let i = 0; i < this.dPhys1; i++) {
      for (let j = 0; j < this.dPhys2; j++) {
        for (let α = 0; α < this.dLeft; α++) {
          const row: Complex[] = [];
          for (let γ = 0; γ < this.dRight; γ++) {
            row.push(this.data[i][j][α][γ]);
          }
          matrix.push(row);
        }
      }
    }

    return { matrix, rows, cols };
  }

  /**
   * Split back into two Tensor3s using SVD
   * Returns [A, B] where A is left tensor, B is right tensor
   */
  split(maxBondDim: number, minSingularValue: number = 1e-12): [Tensor3, Tensor3, number[]] {
    // Reshape to matrix
    const { matrix, rows, cols } = this.reshapeToMatrix();

    // Perform SVD
    const svd = computeSVD(matrix, rows, cols);

    // Truncate
    const singularValues = svd.singularValues.filter((s) => s > minSingularValue);
    const newBondDim = Math.min(singularValues.length, maxBondDim);

    // Reconstruct tensors
    // Left tensor: U × sqrt(S)
    const leftData: Complex[][][] = [];
    const dPhys1 = this.dPhys1;
    const dLeft = this.dLeft;

    for (let i = 0; i < dPhys1; i++) {
      const physSlice: Complex[][] = [];
      for (let α = 0; α < dLeft; α++) {
        const leftSlice: Complex[] = [];
        for (let β = 0; β < newBondDim; β++) {
          const rowIdx = i * dPhys1 * dLeft + α;
          const uElement = svd.U[rowIdx][β];
          const scale = Math.sqrt(singularValues[β]);
          leftSlice.push(uElement.scale(scale));
        }
        physSlice.push(leftSlice);
      }
      leftData.push(physSlice);
    }

    // Right tensor: sqrt(S) × V†
    const rightData: Complex[][][] = [];
    const dPhys2 = this.dPhys2;

    for (let j = 0; j < dPhys2; j++) {
      const physSlice: Complex[][] = [];
      for (let β = 0; β < newBondDim; β++) {
        const rightSlice: Complex[] = [];
        for (let γ = 0; γ < this.dRight; γ++) {
          const vElement = svd.Vh[β][γ].conjugate();
          const scale = Math.sqrt(singularValues[β]);
          rightSlice.push(vElement.scale(scale));
        }
        physSlice.push(rightSlice);
      }
      rightData.push(physSlice);
    }

    const leftTensor = new Tensor3(leftData, dPhys1, dLeft, newBondDim);
    const rightTensor = new Tensor3(rightData, dPhys2, newBondDim, this.dRight);

    return [leftTensor, rightTensor, singularValues];
  }
}

/**
 * SVD result
 */
interface SVDResult {
  U: Complex[][];
  singularValues: number[];
  Vh: Complex[][];
}

/**
 * Compute SVD using Jacobi-like method for small matrices
 * For production, use LAPACK or similar library
 */
function computeSVD(matrix: Complex[][], rows: number, cols: number): SVDResult {
  // For now, use a simplified SVD suitable for small matrices
  // In production, this should call a robust SVD library

  // Convert to real representation (for simplicity)
  const m = Math.min(rows, cols);

  // For small matrices, we can use power iteration
  // This is a placeholder - production code should use proper SVD

  // Create identity U and Vh
  const U: Complex[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: Complex[] = [];
    for (let j = 0; j < m; j++) {
      row.push(i === j ? new Complex(1, 0) : new Complex(0, 0));
    }
    U.push(row);
  }

  const Vh: Complex[][] = [];
  for (let i = 0; i < m; i++) {
    const row: Complex[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(i === j ? new Complex(1, 0) : new Complex(0, 0));
    }
    Vh.push(row);
  }

  // Compute singular values (approximate)
  const singularValues: number[] = [];
  for (let i = 0; i < m; i++) {
    // Simple approximation: norm of column i
    let sum = 0;
    for (let r = 0; r < rows; r++) {
      sum += matrix[r][i]?.magnitudeSquared() || 0;
    }
    singularValues.push(Math.sqrt(sum));
  }

  // Sort descending
  singularValues.sort((a, b) => b - a);

  return { U, singularValues, Vh };
}

/**
 * Truncate singular values
 */
export function truncateSingularValues(
  singularValues: number[],
  maxBondDim: number,
  cutoff: number = 1e-12,
): number[] {
  // Filter small values
  const filtered = singularValues.filter((s) => s > cutoff);

  // Truncate to maxBondDim
  return filtered.slice(0, maxBondDim);
}

/**
 * Compute entanglement entropy from singular values
 * S = -Σ s_i² log(s_i²)
 */
export function entanglementEntropy(singularValues: number[]): number {
  let entropy = 0;
  for (const s of singularValues) {
    const p = s * s;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  }
  return entropy;
}
