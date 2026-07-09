/**
 * Simulation Engine Interface
 *
 * Defines the contract for all simulation backends.
 * Implementations: StatevectorEngine, MpsEngine, CliffordEngine, DensityMatrixEngine
 */

import { Circuit } from '../../circuit-engine/circuit';
import { Complex } from '../../../common/utils/complex';

/**
 * Result of a quantum simulation
 */
export interface ISimulationResult {
  /**
   * Final statevector (amplitudes for each basis state)
   * Index is the basis state (as BigInt), value is the amplitude
   */
  readonly statevector: Map<bigint, Complex>;

  /**
   * Alias for statevector (optional, for backward compatibility)
   */
  readonly finalState?: Map<bigint, Complex>;

  /**
   * Number of qubits
   */
  readonly numQubits: number;

  /**
   * Measurement outcomes (if measurement was performed)
   */
  readonly measurements?: IMeasurementOutcome[];

  /**
   * Execution time in milliseconds
   */
  readonly executionTimeMs: number;

  /**
   * Memory usage in bytes
   */
  readonly memoryUsageBytes: number;
}

/**
 * Single measurement outcome
 */
export interface IMeasurementOutcome {
  /**
   * Qubit index
   */
  readonly qubit: number;

  /**
   * Measured value (0 or 1)
   */
  readonly value: 0 | 1;

  /**
   * Probability of this outcome
   */
  readonly probability: number;
}

/**
 * Simulation options
 */
export interface ISimulationOptions {
  /**
   * Random seed for reproducible results
   */
  readonly seed?: number;

  /**
   * Whether to normalize the state after each step
   */
  readonly normalizeSteps?: boolean;

  /**
   * Maximum number of amplitudes to track (for sparse simulation)
   */
  readonly maxAmplitudes?: number;

  /**
   * Whether to enable parallel computation
   */
  readonly parallel?: boolean;

  /**
   * Number of shots for probabilistic measurements
   */
  readonly shots?: number;
}

/**
 * Resource estimate for simulation
 */
export interface IResourceEstimate {
  /**
   * Estimated memory required in bytes
   */
  readonly memoryBytes: number;

  /**
   * Estimated time in milliseconds
   */
  readonly timeMs: number;

  /**
   * Can this circuit be simulated?
   */
  readonly canSimulate: boolean;

  /**
   * Reason if cannot simulate
   */
  readonly reason?: string;
}

/**
 * Base interface for all simulation engines
 */
export interface ISimulationEngine {
  /**
   * Name of the engine
   */
  readonly name: string;

  /**
   * Check if this engine can simulate a given circuit
   */
  supports(circuit: Circuit): boolean;

  /**
   * Estimate resources required for simulation
   */
  estimateResources(circuit: Circuit): IResourceEstimate;

  /**
   * Run the simulation
   */
  simulate(circuit: Circuit, options?: ISimulationOptions): ISimulationResult;

  /**
   * Run the simulation (alias for simulate)
   */
  run(circuit: Circuit, options?: ISimulationOptions): ISimulationResult;

  /**
   * Get the maximum number of qubits supported
   */
  readonly maxQubits: number;
}
