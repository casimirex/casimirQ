/**
 * Multi-qubit quantum gates
 *
 * Implements entanglement and controlled gates:
 * - CNOT, CZ (controlled gates)
 * - SWAP (qubit swapping)
 * - Toffoli (CCX - controlled-controlled-X)
 * - Fredkin (CSWAP - controlled-SWAP)
 */

import { Matrix } from '../../../common/utils/matrix';
import { Complex } from '../../../common/utils/complex';
import { ITwoQubitGate, IThreeQubitGate } from '../interfaces/gate.interface';

/**
 * CNOT gate (Controlled-X)
 * Applies X to target if control is |1⟩
 *
 * CNOT = [[1, 0, 0, 0],
 *         [0, 1, 0, 0],
 *         [0, 0, 0, 1],
 *         [0, 0, 1, 0]]
 */
export class CnotGate implements ITwoQubitGate {
  readonly type = 'cx';
  readonly name = 'CNOT';
  readonly numQubits = 2;

  /**
   * By default, control is qubit 0, target is qubit 1
   * This creates the matrix where states |10⟩ and |11⟩ are swapped
   */
  readonly matrix = Matrix.fromReal([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
    [0, 0, 1, 0],
  ]);

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Controlled-Z gate (CZ)
 * Applies Z to target if control is |1⟩
 *
 * CZ = [[1, 0, 0, 0],
 *       [0, 1, 0, 0],
 *       [0, 0, 1, 0],
 *       [0, 0, 0, -1]]
 */
export class CzGate implements ITwoQubitGate {
  readonly type = 'cz';
  readonly name = 'CZ';
  readonly numQubits = 2;
  readonly matrix = Matrix.fromReal([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, -1],
  ]);

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Controlled-Phase gate (CP)
 * Applies phase rotation to |11⟩ state
 *
 * CP(λ) = [[1, 0, 0, 0],
 *          [0, 1, 0, 0],
 *          [0, 0, 1, 0],
 *          [0, 0, 0, e^(iλ)]]
 */
export class CpGate implements ITwoQubitGate {
  readonly type = 'cp';
  readonly name = 'Controlled-Phase';
  readonly numQubits = 2;
  readonly matrix: Matrix;
  readonly lambda: number;

  constructor(lambda: number = Math.PI / 4) {
    this.lambda = lambda;
    this.matrix = new Matrix([
      [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(0, 0), new Complex(1, 0), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(Math.cos(lambda), Math.sin(lambda))],
    ]);
  }

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * SWAP gate
 * Swaps two qubits: |01⟩ ↔ |10⟩
 *
 * SWAP = [[1, 0, 0, 0],
 *         [0, 0, 1, 0],
 *         [0, 1, 0, 0],
 *         [0, 0, 0, 1]]
 */
export class SwapGate implements ITwoQubitGate {
  readonly type = 'swap';
  readonly name = 'SWAP';
  readonly numQubits = 2;
  readonly matrix = Matrix.fromReal([
    [1, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
  ]);

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * iSWAP gate
 * Like SWAP but adds i phase to swapped components
 *
 * iSWAP = [[1, 0, 0, 0],
 *          [0, 0, i, 0],
 *          [0, i, 0, 0],
 *          [0, 0, 0, 1]]
 */
export class ISwapGate implements ITwoQubitGate {
  readonly type = 'iswap';
  readonly name = 'iSWAP';
  readonly numQubits = 2;
  readonly matrix = new Matrix([
    [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 0), new Complex(0, 1), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 1), new Complex(0, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 0), new Complex(0, 0), new Complex(1, 0)],
  ]);

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Controlled-Hadamard gate
 * Applies H to target if control is |1⟩
 */
export class ChGate implements ITwoQubitGate {
  readonly type = 'ch';
  readonly name = 'Controlled-H';
  readonly numQubits = 2;
  readonly matrix = new Matrix([
    [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 0), new Complex(1 / Math.sqrt(2), 0), new Complex(1 / Math.sqrt(2), 0)],
    [new Complex(0, 0), new Complex(0, 0), new Complex(1 / Math.sqrt(2), 0), new Complex(-1 / Math.sqrt(2), 0)],
  ]);

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Controlled-Rx gate
 * Applies Rx(θ) to target if control is |1⟩
 */
export class CrxGate implements ITwoQubitGate {
  readonly type = 'crx';
  readonly name = 'Controlled-Rx';
  readonly numQubits = 2;
  readonly theta: number;
  readonly matrix: Matrix;

  constructor(theta: number) {
    this.theta = theta;
    const halfTheta = theta / 2;
    const cos = Math.cos(halfTheta);
    const sin = Math.sin(halfTheta);

    this.matrix = new Matrix([
      [new Complex(1, 0), new Complex(0, 0), new Complex(0, 0), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(1, 0), new Complex(0, 0), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(0, 0), new Complex(cos, 0), new Complex(0, -sin)],
      [new Complex(0, 0), new Complex(0, 0), new Complex(0, -sin), new Complex(cos, 0)],
    ]);
  }

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Toffoli gate (CCX - Controlled-Controlled-X)
 * Applies X to target if both controls are |1⟩
 * Also known as the "controlled-controlled-not" gate
 *
 * This is a universal gate for classical computation
 */
export class ToffoliGate implements IThreeQubitGate {
  readonly type = 'ccx';
  readonly name = 'Toffoli (CCX)';
  readonly numQubits = 3;
  readonly matrix: Matrix;

  constructor() {
    // 8x8 matrix
    const data: Complex[][] = [];
    for (let i = 0; i < 8; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < 8; j++) {
        row.push(new Complex(0, 0));
      }
      data.push(row);
    }

    // Identity on first 6 states (|000⟩ through |101⟩)
    for (let i = 0; i < 6; i++) {
      data[i][i] = new Complex(1, 0);
    }

    // Swap |110⟩ and |111⟩ (last two states)
    data[6][7] = new Complex(1, 0);
    data[7][6] = new Complex(1, 0);

    this.matrix = new Matrix(data);
  }

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Fredkin gate (CSWAP - Controlled-SWAP)
 * Swaps target qubits if control is |1⟩
 */
export class FredkinGate implements IThreeQubitGate {
  readonly type = 'cswap';
  readonly name = 'Fredkin (CSWAP)';
  readonly numQubits = 3;
  readonly matrix: Matrix;

  constructor() {
    // 8x8 matrix
    const data: Complex[][] = [];
    for (let i = 0; i < 8; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < 8; j++) {
        row.push(new Complex(0, 0));
      }
      data.push(row);
    }

    // Identity on states where control is |0⟩ (first 4 states: |000⟩-|011⟩)
    for (let i = 0; i < 4; i++) {
      data[i][i] = new Complex(1, 0);
    }

    // Identity on |100⟩ and |111⟩
    data[4][4] = new Complex(1, 0);
    data[7][7] = new Complex(1, 0);

    // Swap |101⟩ and |110⟩
    data[5][6] = new Complex(1, 0);
    data[6][5] = new Complex(1, 0);

    this.matrix = new Matrix(data);
  }

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Controlled-Controlled-Z gate (CCZ)
 * Applies Z to target if both controls are |1⟩
 */
export class CczGate implements IThreeQubitGate {
  readonly type = 'ccz';
  readonly name = 'CCZ';
  readonly numQubits = 3;
  readonly matrix: Matrix;

  constructor() {
    // 8x8 diagonal matrix with -1 on |111⟩
    const data: Complex[][] = [];
    for (let i = 0; i < 8; i++) {
      const row: Complex[] = [];
      for (let j = 0; j < 8; j++) {
        row.push(new Complex(0, 0));
      }
      data.push(row);
    }

    // Identity on all states except |111⟩
    for (let i = 0; i < 7; i++) {
      data[i][i] = new Complex(1, 0);
    }

    // -1 phase on |111⟩
    data[7][7] = new Complex(-1, 0);

    this.matrix = new Matrix(data);
  }

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Factory for creating multi-qubit gates
 */
export function createMultiQubitGate(
  type: string,
  params?: Record<string, number>,
): ITwoQubitGate | IThreeQubitGate {
  switch (type.toLowerCase()) {
    case 'cx':
    case 'cnot':
      return new CnotGate();
    case 'cz':
      return new CzGate();
    case 'cp':
    case 'cphase':
      return new CpGate(params?.lambda);
    case 'swap':
      return new SwapGate();
    case 'iswap':
      return new ISwapGate();
    case 'ch':
      return new ChGate();
    case 'crx':
      if (params?.theta === undefined) throw new Error('CRx gate requires theta parameter');
      return new CrxGate(params.theta);
    case 'ccx':
    case 'toffoli':
      return new ToffoliGate();
    case 'cswap':
    case 'fredkin':
      return new FredkinGate();
    case 'ccz':
      return new CczGate();
    default:
      throw new Error(`Unknown multi-qubit gate type: ${type}`);
  }
}

/**
 * Get all multi-qubit gate types
 */
export function getMultiQubitGateTypes(): string[] {
  return ['cx', 'cz', 'cp', 'swap', 'iswap', 'ch', 'crx', 'ccx', 'cswap', 'ccz'];
}
