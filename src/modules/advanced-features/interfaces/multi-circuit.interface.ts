/**
 * Multi-Circuit Execution Interfaces
 *
 * Defines types for batch processing, circuit pipelines,
 * and distributed execution.
 */

import { Circuit } from '../../circuit-engine/circuit';
import { ISimulationResult } from '../../simulation-engines/interfaces/simulation-engine.interface';

/**
 * Circuit batch entry
 */
export interface ICircuitBatchEntry {
  /**
   * Circuit ID
   */
  readonly id: string;

  /**
   * Circuit to execute
   */
  readonly circuit: Circuit;

  /**
   * Simulation options
   */
  readonly options?: {
    engine?: string;
    shots?: number;
    seed?: number;
  };

  /**
   * Priority (higher = executed first)
   */
  readonly priority?: number;

  /**
   * Dependencies (circuit IDs that must complete first)
   */
  readonly dependencies?: string[];
}

/**
 * Batch execution options
 */
export interface IBatchExecutionOptions {
  /**
   * Maximum parallel circuits
   */
  readonly maxParallel?: number;

  /**
   * Execution strategy
   */
  readonly strategy: 'sequential' | 'parallel' | 'distributed';

  /**
   * Timeout per circuit (ms)
   */
  readonly timeoutMs?: number;

  /**
   * Retry failed circuits
   */
  readonly retryFailed?: boolean;

  /**
   * Callback on circuit completion
   */
  readonly onCircuitComplete?: (id: string, result: ISimulationResult) => void;

  /**
   * Callback on batch completion
   */
  readonly onBatchComplete?: (results: IBatchResult) => void;
}

/**
 * Batch execution result
 */
export interface IBatchResult {
  /**
   * Circuit results
   */
  readonly results: Map<string, ISimulationResult>;

  /**
   * Failed circuit IDs
   */
  readonly failed: string[];

  /**
   * Total execution time
   */
  readonly totalTimeMs: number;

  /**
   * Average time per circuit
   */
  readonly averageTimeMs: number;

  /**
   * Success rate
   */
  readonly successRate: number;

  /**
   * Resource usage
   */
  readonly resources: {
    cpuTimeMs: number;
    memoryPeakBytes: number;
    circuitsExecuted: number;
  };
}

/**
 * Circuit pipeline stage
 */
export interface IPipelineStage {
  /**
   * Stage name
   */
  readonly name: string;

  /**
   * Stage function
   */
  execute: (input: Circuit | Circuit[]) => Circuit | Circuit[] | Promise<Circuit | Circuit[]>;

  /**
   * Stage type
   */
  readonly type: 'transform' | 'optimize' | 'validate' | 'simulate' | 'custom';

  /**
   * Whether to run in parallel
   */
  readonly parallel?: boolean;
}

/**
 * Circuit pipeline
 */
export interface ICircuitPipeline {
  /**
   * Pipeline name
   */
  readonly name: string;

  /**
   * Pipeline stages
   */
  readonly stages: IPipelineStage[];

  /**
   * Pipeline options
   */
  readonly options?: {
    stopOnError?: boolean;
    collectMetrics?: boolean;
    maxRetries?: number;
  };
}

/**
 * Pipeline execution result
 */
export interface IPipelineResult {
  /**
   * Final circuit(s)
   */
  readonly output: Circuit | Circuit[];

  /**
   * Stage results
   */
  readonly stageResults: {
    stage: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }[];

  /**
   * Total execution time
   */
  readonly totalTimeMs: number;

  /**
   * Metrics collected
   */
  readonly metrics?: Map<string, unknown>;
}

/**
 * Distributed execution node
 */
export interface IExecutionNode {
  /**
   * Node ID
   */
  readonly id: string;

  /**
   * Node capabilities
   */
  readonly capabilities: {
    maxQubits: number;
    supportedEngines: string[];
    gpuAvailable: boolean;
    memoryBytes: number;
  };

  /**
   * Node status
   */
  status: 'idle' | 'busy' | 'offline';

  /**
   * Current load
   */
  currentLoad?: number;
}

/**
 * Distributed execution task
 */
export interface IDistributedTask {
  /**
   * Task ID
   */
  readonly taskId: string;

  /**
   * Circuit to execute
   */
  readonly circuit: Circuit;

  /**
   * Assigned node
   */
  assignedNode?: string;

  /**
   * Task status
   */
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';

  /**
   * Result (when completed)
   */
  result?: ISimulationResult;

  /**
   * Error (if failed)
   */
  error?: string;
}

/**
 * Distributed execution result
 */
export interface IDistributedResult {
  /**
   * Task results
   */
  readonly results: Map<string, ISimulationResult>;

  /**
   * Task distribution
   */
  readonly distribution: Map<string, string>; // taskId -> nodeId

  /**
   * Node utilization
   */
  readonly nodeUtilization: Map<string, number>; // nodeId -> utilization %

  /**
   * Total execution time
   */
  readonly totalTimeMs: number;

  /**
   * Speedup vs sequential
   */
  readonly speedup?: number;
}

/**
 * Circuit DAG (for dependency tracking)
 */
export interface ICircuitDAG {
  /**
   * Nodes (circuits)
   */
  readonly nodes: Map<string, Circuit>;

  /**
   * Edges (dependencies)
   */
  readonly edges: Map<string, string[]>; // circuitId -> dependencies

  /**
   * Topological order
   */
  readonly topologicalOrder: string[];

  /**
   * Check if DAG is valid
   */
  isValid(): boolean;

  /**
   * Get circuits ready to execute
   */
  getReadyCircuits(completed: string[]): string[];
}

/**
 * Execution scheduler
 */
export interface IExecutionScheduler {
  /**
   * Schedule batch execution
   */
  scheduleBatch(
    circuits: ICircuitBatchEntry[],
    options: IBatchExecutionOptions,
  ): Promise<IBatchResult>;

  /**
   * Schedule pipeline execution
   */
  schedulePipeline(
    pipeline: ICircuitPipeline,
    input: Circuit | Circuit[],
  ): Promise<IPipelineResult>;

  /**
   * Schedule distributed execution
   */
  scheduleDistributed(
    tasks: IDistributedTask[],
    nodes: IExecutionNode[],
  ): Promise<IDistributedResult>;
}
