/**
 * Gate interface for casimirQ
 *
 * Defines the contract for all quantum gates in the system.
 */

import { Matrix } from '../../../common/utils/matrix';

/**
 * Base interface for all quantum gates
 */
export interface IGate {
  /**
   * Unique identifier for the gate type
   */
  readonly type: string;

  /**
   * Matrix representation of the gate
     */
  readonly matrix: Matrix;

  /**
   * Number of qubits this gate acts on
   */
  readonly numQubits: number;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Whether this gate is unitary
   */
  isUnitary(): boolean;
}

/**
 * Interface for single-qubit gates
 */
export interface ISingleQubitGate extends IGate {
  readonly numQubits: 1;
}

/**
 * Interface for two-qubit gates
 */
export interface ITwoQubitGate extends IGate {
  readonly numQubits: 2;
}

/**
 * Interface for three-qubit gates
 */
export interface IThreeQubitGate extends IGate {
  readonly numQubits: 3;
}

/**
 * Interface for parametric gates (gates with parameters like rotation angles)
 */
export interface IParametricGate extends IGate {
  /**
   * Parameters of the gate
   */
  readonly params: Record<string, number>;

  /**
   * Bind new parameters and return a new gate instance
   */
  bind(params: Partial<Record<string, number>>): IParametricGate;
}

/**
 * Gate metadata for registry
 */
export interface IGateMetadata {
  type: string;
  numQubits: number;
  description: string;
  isParametric: boolean;
  params?: string[];
}
