/**
 * Noise Modeling Interfaces
 *
 * Defines types for quantum noise channels and error models.
 */

import { Complex } from '../../../common/utils/complex';

/**
 * Noise channel types
 */
export type NoiseChannelType =
  | 'depolarizing'
  | 'amplitude_damping'
  | 'phase_damping'
  | 'bit_flip'
  | 'phase_flip'
  | 'bit_phase_flip'
  | 'custom';

/**
 * Noise channel parameters
 */
export interface INoiseChannelParams {
  /**
   * Depolarizing probability
   */
  readonly pDepolarizing?: number;

  /**
   * Amplitude damping rate
   */
  readonly gamma?: number;

  /**
   * Phase damping rate
   */
  readonly lambda?: number;

  /**
   * Bit flip probability
   */
  readonly pBitFlip?: number;

  /**
   * Phase flip probability
   */
  readonly pPhaseFlip?: number;

  /**
   * Temperature (for thermal noise)
   */
  readonly temperature?: number;

  /**
   * Decoherence time T1
   */
  readonly T1?: number;

  /**
   * Dephasing time T2
   */
  readonly T2?: number;

  /**
   * Custom Kraus operators
   */
  readonly krausOperators?: Complex[][][];
}

/**
 * Noise channel definition
 */
export interface INoiseChannel {
  /**
   * Channel type
   */
  readonly type: NoiseChannelType;

  /**
   * Target qubits
   */
  readonly targetQubits: number[];

  /**
   * Channel parameters
   */
  readonly params: INoiseChannelParams;

  /**
   * Channel name (for identification)
   */
  readonly name?: string;
}

/**
 * Noise model for a quantum device
 */
export interface INoiseModel {
  /**
   * Model name
   */
  readonly name: string;

  /**
   * Single-qubit gate errors
   */
  readonly singleQubitErrors: {
    gate: string;
    error: INoiseChannel;
  }[];

  /**
   * Two-qubit gate errors
   */
  readonly twoQubitErrors: {
    gate: string;
    error: INoiseChannel;
  }[];

  /**
   * Measurement errors
   */
  readonly measurementErrors: {
    qubit: number;
    pFlip0to1: number;
    pFlip1to0: number;
  }[];

  /**
   * T1 relaxation times per qubit
   */
  readonly T1?: Map<number, number>;

  /**
   * T2 dephasing times per qubit
   */
  readonly T2?: Map<number, number>;

  /**
   * Readout errors
   */
  readonly readoutErrors?: Map<number, { p0: number; p1: number }>;
}

/**
 * Noise simulation options
 */
export interface INoiseSimulationOptions {
  /**
   * Enable noise
   */
  readonly enableNoise: boolean;

  /**
   * Noise model to use
   */
  readonly noiseModel?: INoiseModel;

  /**
   * Custom noise channels
   */
  readonly customChannels?: INoiseChannel[];

  /**
   * Number of noise samples
   */
  readonly shots?: number;

  /**
   * Seed for reproducibility
   */
  readonly seed?: number;
}

/**
 * Noise simulation result
 */
export interface INoiseResult {
  /**
   * Noisy statevector (averaged over shots)
   */
  readonly noisyState: Map<bigint, Complex>;

  /**
   * Density matrix (if computed)
   */
  readonly densityMatrix?: Complex[][];

  /**
   * Measurement outcomes with noise
   */
  readonly noisyMeasurements: Map<number, { outcomes: number[]; counts: number[] }>;

  /**
   * Error rates
   */
  readonly errorRates: {
    total: number;
    byGate: Map<string, number>;
    byQubit: Map<number, number>;
  };

  /**
   * Fidelity with ideal circuit
   */
  readonly fidelity: number;

  /**
   * Execution time
   */
  readonly executionTimeMs: number;
}

/**
 * Device characteristics
 */
export interface IDeviceCharacteristics {
  /**
   * Number of qubits
   */
  readonly nQubits: number;

  /**
   * Connectivity graph
   */
  readonly connectivity: Map<number, number[]>;

  /**
   * Gate times
   */
  readonly gateTimes: Map<string, number>;

  /**
   * T1 times per qubit
   */
  readonly T1: number[];

  /**
   * T2 times per qubit
   */
  readonly T2: number[];

  /**
   * Gate errors
   */
  readonly gateErrors: Map<string, number>;

  /**
   * Readout errors per qubit
   */
  readonly readoutErrors: Map<number, number>;
}
