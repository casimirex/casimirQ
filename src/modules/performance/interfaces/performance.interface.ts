/**
 * Performance Optimization Interfaces
 *
 * Defines contracts for caching, circuit optimization, and execution profiling.
 */

/**
 * Cache entry metadata
 */
export interface ICacheEntry<T> {
  /** Cached value */
  value: T;

  /** Creation timestamp */
  createdAt: number;

  /** Expiration timestamp */
  expiresAt: number;

  /** Access count */
  accessCount: number;

  /** Entry size in bytes (estimated) */
  sizeBytes: number;
}

/**
 * Cache statistics
 */
export interface ICacheStats {
  /** Total entries */
  entryCount: number;

  /** Total size in bytes */
  totalSizeBytes: number;

  /** Hit count */
  hits: number;

  /** Miss count */
  misses: number;

  /** Hit rate (0-1) */
  hitRate: number;

  /** Eviction count */
  evictions: number;
}

/**
 * Circuit optimization options
 */
export interface ICircuitOptimizationOptions {
  /** Enable gate fusion */
  fuseGates?: boolean;

  /** Enable commutation optimization */
  commuteGates?: boolean;

  /** Enable cancellation of inverse gates */
  cancelInverses?: boolean;

  /** Remove identity gates */
  removeIdentities?: boolean;

  /** Maximum optimization passes */
  maxPasses?: number;
}

/**
 * Optimization result
 */
export interface IOptimizationResult {
  /** Original gate count */
  originalGateCount: number;

  /** Optimized gate count */
  optimizedGateCount: number;

  /** Reduction percentage */
  reductionPercent: number;

  /** Applied optimizations */
  appliedOptimizations: string[];

  /** Optimization time in ms */
  optimizationTimeMs: number;
}

/**
 * Execution profile
 */
export interface IExecutionProfile {
  /** Operation name */
  operation: string;

  /** Start time */
  startTime: number;

  /** End time */
  endTime: number;

  /** Duration in ms */
  durationMs: number;

  /** Memory used (bytes) */
  memoryUsed: number;

  /** CPU usage estimate */
  cpuUsage: number;

  /** Number of qubits */
  numQubits?: number;

  /** Number of gates */
  numGates?: number;
}

/**
 * Performance metrics
 */
export interface IPerformanceMetrics {
  /** Request latency (ms) */
  requestLatency: number;

  /** Throughput (requests/sec) */
  throughput: number;

  /** Error rate */
  errorRate: number;

  /** Active connections */
  activeConnections: number;

  /** Memory usage */
  memoryUsage: {
    used: number;
    total: number;
    percent: number;
  };

  /** CPU usage */
  cpuUsage: number;
}

/**
 * Batch execution options
 */
export interface IBatchExecutionOptions {
  /** Maximum batch size */
  maxBatchSize: number;

  /** Maximum wait time for batch (ms) */
  maxWaitTimeMs: number;

  /** Enable parallel execution */
  parallel: boolean;

  /** Number of parallel workers */
  numWorkers?: number;
}

/**
 * Profiling configuration
 */
export interface IProfilingConfig {
  /** Enable profiling */
  enabled: boolean;

  /** Sample rate (0-1) */
  sampleRate: number;

  /** Profile memory */
  profileMemory: boolean;

  /** Profile CPU */
  profileCpu: boolean;

  /** Max profile duration (ms) */
  maxDurationMs: number;
}
