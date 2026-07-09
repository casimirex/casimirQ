/**
 * Quantum Error Correction Interfaces
 *
 * Defines types for stabilizer codes, syndrome measurement,
 * and error correction operations.
 */

/**
 * Pauli operator types
 */
export type PauliOperator = 'I' | 'X' | 'Y' | 'Z';

/**
 * Stabilizer generator
 */
export interface IStabilizer {
  /**
   * Stabilizer name/identifier
   */
  readonly name: string;

  /**
   * Pauli operators for each qubit
   */
  readonly operators: PauliOperator[];

  /**
   * Phase factor (+1 or -1)
   */
  readonly phase: number;
}

/**
 * Syndrome measurement result
 */
export interface ISyndromeResult {
  /**
   * Syndrome bitstring (0 or 1 for each stabilizer)
   */
  readonly syndrome: number[];

  /**
   * Detected error pattern (if any)
   */
  readonly errorPattern?: {
    qubit: number;
    type: PauliOperator;
  }[];

  /**
   * Correction operation to apply
   */
  readonly correction?: {
    qubit: number;
    operation: PauliOperator;
  }[];
}

/**
 * Quantum Error Correction Code
 */
export interface IQECCode {
  /**
   * Code name (e.g., 'Steane', 'Shor', 'Surface-17')
   */
  readonly name: string;

  /**
   * Number of physical qubits
   */
  readonly nPhysical: number;

  /**
   * Number of logical qubits
   */
  readonly nLogical: number;

  /**
   * Code distance
   */
  readonly distance: number;

  /**
   * Number of X-type stabilizers
   */
  readonly nXStabilizers: number;

  /**
   * Number of Z-type stabilizers
   */
  readonly nZStabilizers: number;

  /**
   * Stabilizer generators
   */
  readonly stabilizers: IStabilizer[];

  /**
   * Logical X operators
   */
  readonly logicalX: IStabilizer[];

  /**
   * Logical Z operators
   */
  readonly logicalZ: IStabilizer[];
}

/**
 * Encoded logical state
 */
export interface IEncodedState {
  /**
   * Logical qubit values
   */
  readonly logicalState: number[];

  /**
   * Physical qubit state (if tracked)
   */
  readonly physicalState?: Map<string, number>;

  /**
   * Current syndrome
   */
  readonly syndrome?: number[];
}

/**
 * QEC execution options
 */
export interface IQECOptions {
  /**
   * Enable syndrome measurement
   */
  readonly measureSyndrome?: boolean;

  /**
   * Enable automatic correction
   */
  readonly autoCorrect?: boolean;

  /**
   * Maximum number of correction rounds
   */
  readonly maxRounds?: number;
}

/**
 * QEC simulation result
 */
export interface IQECResult {
  /**
   * Whether encoding was successful
   */
  readonly success: boolean;

  /**
   * Encoded state
   */
  readonly encodedState: IEncodedState;

  /**
   * Syndrome measurements
   */
  readonly syndromeMeasurements: ISyndromeResult[];

  /**
   * Corrections applied
   */
  readonly correctionsApplied: {
    round: number;
    correction: { qubit: number; operation: PauliOperator }[];
  }[];

  /**
   * Execution time in milliseconds
   */
  readonly executionTimeMs: number;
}
