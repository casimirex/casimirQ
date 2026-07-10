/**
 * Standard single-qubit quantum gates
 *
 * Implements the fundamental single-qubit gates used in quantum computing:
 * - Pauli gates: X, Y, Z
 * - Hadamard gate: H
 * - Phase gates: S, T
 * - Rotation gates: Rx, Ry, Rz
 * - General gates: U, P (phase)
 */

import { Matrix } from '../../../common/utils/matrix';
import { Complex, COMPLEX_CONSTANTS } from '../../../common/utils/complex';
import { ISingleQubitGate, IParametricGate } from '../interfaces/gate.interface';

/**
 * Base class for single-qubit gates
 */
abstract class SingleQubitGate implements ISingleQubitGate {
  abstract readonly type: string;
  abstract readonly name: string;
  readonly numQubits = 1;
  abstract readonly matrix: Matrix;

  isUnitary(): boolean {
    return this.matrix.isUnitary();
  }
}

/**
 * Pauli-X gate (NOT gate)
 * X = [[0, 1], [1, 0]]
 * Flips |0⟩ ↔ |1⟩
 */
export class XGate extends SingleQubitGate {
  readonly type = 'x';
  readonly name = 'Pauli-X';
  readonly matrix = Matrix.fromReal([
    [0, 1],
    [1, 0],
  ]);
}

/**
 * Pauli-Y gate
 * Y = [[0, -i], [i, 0]]
 */
export class YGate extends SingleQubitGate {
  readonly type = 'y';
  readonly name = 'Pauli-Y';
  readonly matrix = new Matrix([
    [new Complex(0, 0), new Complex(0, -1)],
    [new Complex(0, 1), new Complex(0, 0)],
  ]);
}

/**
 * Pauli-Z gate
 * Z = [[1, 0], [0, -1]]
 * Flips phase of |1⟩
 */
export class ZGate extends SingleQubitGate {
  readonly type = 'z';
  readonly name = 'Pauli-Z';
  readonly matrix = Matrix.fromReal([
    [1, 0],
    [0, -1],
  ]);
}

/**
 * Hadamard gate
 * H = 1/√2 [[1, 1], [1, -1]]
 * Creates superposition
 */
export class HGate extends SingleQubitGate {
  readonly type = 'h';
  readonly name = 'Hadamard';
  readonly matrix = new Matrix([
    [COMPLEX_CONSTANTS.INV_SQRT2, COMPLEX_CONSTANTS.INV_SQRT2],
    [COMPLEX_CONSTANTS.INV_SQRT2, COMPLEX_CONSTANTS.INV_SQRT2.scale(-1)],
  ]);
}

/**
 * S gate (Phase gate, π/2 phase)
 * S = [[1, 0], [0, i]]
 */
export class SGate extends SingleQubitGate {
  readonly type = 's';
  readonly name = 'S (Phase)';
  readonly matrix = new Matrix([
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, 1)],
  ]);
}

/**
 * S† (S dagger) gate
 * S† = [[1, 0], [0, -i]]
 */
export class SDaggerGate extends SingleQubitGate {
  readonly type = 'sdg';
  readonly name = 'S†';
  readonly matrix = new Matrix([
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(0, -1)],
  ]);
}

/**
 * T gate (π/8 gate, π/4 phase)
 * T = [[1, 0], [0, e^(iπ/4)]]
 */
export class TGate extends SingleQubitGate {
  readonly type = 't';
  readonly name = 'T (π/8)';
  readonly matrix = new Matrix([
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))],
  ]);
}

/**
 * T† (T dagger) gate
 * T† = [[1, 0], [0, e^(-iπ/4)]]
 */
export class TDaggerGate extends SingleQubitGate {
  readonly type = 'tdg';
  readonly name = 'T†';
  readonly matrix = new Matrix([
    [new Complex(1, 0), new Complex(0, 0)],
    [new Complex(0, 0), new Complex(Math.cos(Math.PI / 4), -Math.sin(Math.PI / 4))],
  ]);
}

/**
 * Identity gate
 * I = [[1, 0], [0, 1]]
 */
export class IGate extends SingleQubitGate {
  readonly type = 'i';
  readonly name = 'Identity';
  readonly matrix = Matrix.identity(2);
}

/**
 * Rotation-X gate (Rx)
 * Rx(θ) = [[cos(θ/2), -i*sin(θ/2)], [-i*sin(θ/2), cos(θ/2)]]
 */
export class RxGate extends SingleQubitGate implements IParametricGate {
  readonly type = 'rx';
  readonly name = 'Rotation-X';
  readonly params: { theta: number };
  readonly matrix: Matrix;

  constructor(theta: number) {
    super();
    this.params = { theta };
    const halfTheta = theta / 2;
    const cos = Math.cos(halfTheta);
    const sin = Math.sin(halfTheta);
    this.matrix = new Matrix([
      [new Complex(cos, 0), new Complex(0, -sin)],
      [new Complex(0, -sin), new Complex(cos, 0)],
    ]);
  }

  bind(params: Partial<{ theta: number }>): RxGate {
    return new RxGate(params.theta ?? this.params.theta);
  }
}

/**
 * Rotation-Y gate (Ry)
 * Ry(θ) = [[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]
 */
export class RyGate extends SingleQubitGate implements IParametricGate {
  readonly type = 'ry';
  readonly name = 'Rotation-Y';
  readonly params: { theta: number };
  readonly matrix: Matrix;

  constructor(theta: number) {
    super();
    this.params = { theta };
    const halfTheta = theta / 2;
    const cos = Math.cos(halfTheta);
    const sin = Math.sin(halfTheta);
    this.matrix = Matrix.fromReal([
      [cos, -sin],
      [sin, cos],
    ]);
  }

  bind(params: Partial<{ theta: number }>): RyGate {
    return new RyGate(params.theta ?? this.params.theta);
  }
}

/**
 * Rotation-Z gate (Rz)
 * Rz(θ) = [[e^(-iθ/2), 0], [0, e^(iθ/2)]]
 */
export class RzGate extends SingleQubitGate implements IParametricGate {
  readonly type = 'rz';
  readonly name = 'Rotation-Z';
  readonly params: { theta: number };
  readonly matrix: Matrix;

  constructor(theta: number) {
    super();
    this.params = { theta };
    const halfTheta = theta / 2;
    this.matrix = new Matrix([
      [new Complex(Math.cos(-halfTheta), Math.sin(-halfTheta)), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(Math.cos(halfTheta), Math.sin(halfTheta))],
    ]);
  }

  bind(params: Partial<{ theta: number }>): RzGate {
    return new RzGate(params.theta ?? this.params.theta);
  }
}

/**
 * Phase gate P(λ)
 * P(λ) = [[1, 0], [0, e^(iλ)]]
 */
export class PhaseGate extends SingleQubitGate implements IParametricGate {
  readonly type = 'p';
  readonly name = 'Phase';
  readonly params: { lambda: number };
  readonly matrix: Matrix;

  constructor(lambda: number) {
    super();
    this.params = { lambda };
    this.matrix = new Matrix([
      [new Complex(1, 0), new Complex(0, 0)],
      [new Complex(0, 0), new Complex(Math.cos(lambda), Math.sin(lambda))],
    ]);
  }

  bind(params: Partial<{ lambda: number }>): PhaseGate {
    return new PhaseGate(params.lambda ?? this.params.lambda);
  }
}

/**
 * U gate (Universal single-qubit gate)
 * U(θ, φ, λ) = [[cos(θ/2), -e^(iλ)*sin(θ/2)],
 *               [e^(iφ)*sin(θ/2), e^(i(φ+λ))*cos(θ/2)]]
 */
export class UGate extends SingleQubitGate implements IParametricGate {
  readonly type = 'u';
  readonly name = 'Universal';
  readonly params: { theta: number; phi: number; lambda: number };
  readonly matrix: Matrix;

  constructor(theta: number, phi: number, lambda: number) {
    super();
    this.params = { theta, phi, lambda };
    const halfTheta = theta / 2;
    const cos = Math.cos(halfTheta);
    const sin = Math.sin(halfTheta);
    const ePhi = new Complex(Math.cos(phi), Math.sin(phi));
    const eLambda = new Complex(Math.cos(lambda), Math.sin(lambda));
    const ePhiLambda = new Complex(Math.cos(phi + lambda), Math.sin(phi + lambda));

    this.matrix = new Matrix([
      [new Complex(cos, 0), eLambda.scale(-sin)],
      [ePhi.scale(sin), ePhiLambda.scale(cos)],
    ]);
  }

  bind(params: Partial<{ theta: number; phi: number; lambda: number }>): UGate {
    return new UGate(
      params.theta ?? this.params.theta,
      params.phi ?? this.params.phi,
      params.lambda ?? this.params.lambda,
    );
  }
}

/**
 * Factory for creating gates by name
 */
export function createGate(type: string, params?: Record<string, number>): ISingleQubitGate {
  switch (type.toLowerCase()) {
    case 'x':
      return new XGate();
    case 'y':
      return new YGate();
    case 'z':
      return new ZGate();
    case 'h':
    case 'hadamard':
      return new HGate();
    case 's':
      return new SGate();
    case 'sdg':
      return new SDaggerGate();
    case 't':
      return new TGate();
    case 'tdg':
      return new TDaggerGate();
    case 'i':
    case 'id':
      return new IGate();
    case 'rx':
      if (params?.theta === undefined) throw new Error('Rx gate requires theta parameter');
      return new RxGate(params.theta);
    case 'ry':
      if (params?.theta === undefined) throw new Error('Ry gate requires theta parameter');
      return new RyGate(params.theta);
    case 'rz':
      if (params?.theta === undefined) throw new Error('Rz gate requires theta parameter');
      return new RzGate(params.theta);
    case 'p':
    case 'ph':
    case 'phase':
      if (params?.lambda === undefined) throw new Error('Phase gate requires lambda parameter');
      return new PhaseGate(params.lambda);
    case 'u':
      if (
        params?.theta === undefined ||
        params?.phi === undefined ||
        params?.lambda === undefined
      ) {
        throw new Error('U gate requires theta, phi, and lambda parameters');
      }
      return new UGate(params.theta, params.phi, params.lambda);
    default:
      throw new Error(`Unknown gate type: ${type}`);
  }
}

/**
 * Get all standard single-qubit gate types
 */
export function getStandardGateTypes(): string[] {
  return ['x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg', 'i', 'rx', 'ry', 'rz', 'p', 'u'];
}

// Aliases for different naming conventions
export { SDaggerGate as SdgGate };
export { TDaggerGate as TdgGate };
