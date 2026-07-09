import { Circuit } from '../../circuit-engine/circuit';
import { Complex } from '../../../common/utils/complex';

/**
 * Sparse vector representation of a quantum state
 */
type SparseVector = Map<bigint, Complex>;

export interface IQuantumAlgorithm {
  readonly name: string;
  readonly description: string;
  readonly category: 'fundamental' | 'search' | 'optimization' | 'cryptography';
  readonly references: string[];

  /**
   * Build the quantum circuit for this algorithm
   * @param params Algorithm-specific parameters
   * @returns A Circuit instance
   */
  buildCircuit(...params: unknown[]): Circuit;

  /**
   * Analyze the circuit before execution
   * @param circuit The built circuit
   * @returns Analysis of the circuit
   */
  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis;

  /**
   * Execute the algorithm with given parameters
   * @param params Algorithm-specific parameters
   * @returns Result of the algorithm execution
   */
  execute(...params: unknown[]): AlgorithmResult;
}

/**
 * Analysis of a quantum algorithm circuit
 */
export interface AlgorithmAnalysis {
  /** Number of qubits */
  qubitCount: number;

  /** Number of gates */
  gateCount: number;

  /** Gate counts by type */
  gateCounts: Record<string, number>;

  /** Circuit depth */
  depth: number;

  /** Number of operations (total gates) */
  operationCount: number;

  /** T-gate count (relevant for fault tolerance) */
  tCount: number;

  /** Multi-qubit gate count */
  multiQubitGateCount: number;

  /** Circuit topology constraints */
  topology: TopologyAnalysis;

  /** Complexity class estimate */
  complexity: string;

  /** Classical simulation cost estimate */
  classicalCost: string;
}

/**
 * Topology analysis for circuit execution
 */
export interface TopologyAnalysis {
  /** Maximum number of qubits between any two connected gates */
  interactionDistance: number;

  /** Number of SWAP operations needed for nearest-neighbor architecture */
  estimatedSwapCount: number;

  /** Compatible architectures */
  compatibleArchitectures: string[];
}

/**
 * Result of algorithm execution
 */
export interface AlgorithmResult {
  /** Measurement outcomes */
  measurements: SparseVector;

  /** Classical data produced */
  classicalData?: Record<string, unknown>;

  /** Execution metrics */
  metrics: ExecutionMetrics;

  /** Algorithm-specific output */
  output: unknown;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Number of shots (if applicable) */
  shots?: number;

  /** Success probability (if applicable) */
  successProbability?: number;

  /** Iteration count (for iterative algorithms) */
  iterations?: number;
}

/**
 * Parametric circuit for variational algorithms
 */
export interface IParametricCircuit {
  /** Get parameter names */
  getParameters(): string[];

  /** Bind parameter values */
  bindParameters(values: Record<string, number>): Circuit;

  /** Build circuit with current bindings */
  build(): Circuit;
}

/**
 * Algorithm registry entry
 */
export interface AlgorithmRegistryEntry {
  name: string;
  description: string;
  category: 'fundamental' | 'search' | 'optimization' | 'cryptography';
  factory: (...args: unknown[]) => IQuantumAlgorithm;
}
