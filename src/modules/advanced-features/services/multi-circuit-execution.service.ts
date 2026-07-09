/**
 * Multi-Circuit Execution Service
 *
 * Implements batch processing, circuit pipelines, and distributed execution.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Circuit } from '../../circuit-engine/circuit';
import { ISimulationResult } from '../../simulation-engines/interfaces/simulation-engine.interface';
import {
  ICircuitBatchEntry,
  IBatchExecutionOptions,
  IBatchResult,
  IPipelineStage,
  ICircuitPipeline,
  IPipelineResult,
  IExecutionNode,
  IDistributedTask,
  IDistributedResult,
} from '../interfaces/multi-circuit.interface';

@Injectable()
export class MultiCircuitExecutionService {
  private readonly logger = new Logger(MultiCircuitExecutionService.name);
  private readonly activeExecutions = new Map<string, AbortController>();

  /**
   * Execute a batch of circuits
   */
  async executeBatch(
    circuits: ICircuitBatchEntry[],
    options: IBatchExecutionOptions,
  ): Promise<IBatchResult> {
    const startTime = performance.now();
    const results = new Map<string, ISimulationResult>();
    const failed: string[] = [];

    // Sort by priority (higher first)
    const sortedCircuits = [...circuits].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );

    // Handle dependencies
    const completed = new Set<string>();
    const pending = new Map(sortedCircuits.map((c) => [c.id, c]));

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.activeExecutions.set('batch-' + startTime, abortController);

    // Execute based on strategy
    switch (options.strategy) {
      case 'parallel':
        await this.executeParallel(
          sortedCircuits,
          options,
          results,
          failed,
          completed,
          pending,
          abortController.signal,
        );
        break;
      case 'sequential':
      default:
        await this.executeSequential(
          sortedCircuits,
          options,
          results,
          failed,
          completed,
          pending,
          abortController.signal,
        );
    }

    const endTime = performance.now();

    // Cleanup
    this.activeExecutions.delete('batch-' + startTime);

    const totalCircuits = circuits.length;
    const successCount = totalCircuits - failed.length;

    const batchResult: IBatchResult = {
      results,
      failed,
      totalTimeMs: endTime - startTime,
      averageTimeMs: successCount > 0 ? (endTime - startTime) / successCount : 0,
      successRate: totalCircuits > 0 ? successCount / totalCircuits : 0,
      resources: {
        cpuTimeMs: endTime - startTime,
        memoryPeakBytes: 0, // Would track actual memory
        circuitsExecuted: successCount,
      },
    };

    // Call completion callback
    if (options.onBatchComplete) {
      options.onBatchComplete(batchResult);
    }

    return batchResult;
  }

  /**
   * Execute circuits in sequence
   */
  private async executeSequential(
    circuits: ICircuitBatchEntry[],
    options: IBatchExecutionOptions,
    results: Map<string, ISimulationResult>,
    failed: string[],
    completed: Set<string>,
    pending: Map<string, ICircuitBatchEntry>,
    signal: AbortSignal,
  ): Promise<void> {
    for (const entry of circuits) {
      if (signal.aborted) {
        break;
      }

      // Check dependencies
      if (entry.dependencies && entry.dependencies.length > 0) {
        const depsSatisfied = entry.dependencies.every((dep) =>
          completed.has(dep),
        );
        if (!depsSatisfied) {
          continue; // Skip for now, will retry
        }
      }

      try {
        const result = await this.executeCircuit(entry, options.timeoutMs);

        if (result) {
          results.set(entry.id, result);
          completed.add(entry.id);
          pending.delete(entry.id);

          if (options.onCircuitComplete) {
            options.onCircuitComplete(entry.id, result);
          }
        }
      } catch (error) {
        this.logger.error(`Circuit ${entry.id} failed:`, error);
        failed.push(entry.id);

        // Retry if enabled
        if (options.retryFailed) {
          try {
            const retryResult = await this.executeCircuit(entry, options.timeoutMs);
            if (retryResult) {
              results.set(entry.id, retryResult);
              failed.pop(); // Remove from failed
              completed.add(entry.id);
            }
          } catch (retryError) {
            this.logger.error(`Retry failed for circuit ${entry.id}:`, retryError);
          }
        }
      }
    }
  }

  /**
   * Execute circuits in parallel
   */
  private async executeParallel(
    circuits: ICircuitBatchEntry[],
    options: IBatchExecutionOptions,
    results: Map<string, ISimulationResult>,
    failed: string[],
    completed: Set<string>,
    pending: Map<string, ICircuitBatchEntry>,
    signal: AbortSignal,
  ): Promise<void> {
    const maxParallel = options.maxParallel ?? 4;
    const executing = new Set<Promise<void>>();

    for (const entry of circuits) {
      if (signal.aborted) {
        break;
      }

      // Wait if at capacity
      while (executing.size >= maxParallel) {
        await Promise.race(executing);
      }

      // Check dependencies
      if (entry.dependencies && entry.dependencies.length > 0) {
        const depsSatisfied = entry.dependencies.every((dep) =>
          completed.has(dep),
        );
        if (!depsSatisfied) {
          continue;
        }
      }

      // Start execution
      const execution = this.executeCircuitEntry(
        entry,
        options,
        results,
        failed,
        completed,
        pending,
        signal,
      );

      executing.add(execution);

      // Clean up when done
      execution.then(() => executing.delete(execution));
    }

    // Wait for all to complete
    await Promise.all(executing);
  }

  /**
   * Execute a single circuit entry
   */
  private async executeCircuitEntry(
    entry: ICircuitBatchEntry,
    options: IBatchExecutionOptions,
    results: Map<string, ISimulationResult>,
    failed: string[],
    completed: Set<string>,
    pending: Map<string, ICircuitBatchEntry>,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const result = await this.executeCircuit(entry, options.timeoutMs);

      if (result && !signal.aborted) {
        results.set(entry.id, result);
        completed.add(entry.id);
        pending.delete(entry.id);

        if (options.onCircuitComplete) {
          options.onCircuitComplete(entry.id, result);
        }
      }
    } catch (error) {
      this.logger.error(`Circuit ${entry.id} failed:`, error);
      if (!signal.aborted) {
        failed.push(entry.id);
      }
    }
  }

  /**
   * Execute a single circuit
   */
  private async executeCircuit(
    entry: ICircuitBatchEntry,
    timeoutMs?: number,
  ): Promise<ISimulationResult | null> {
    // This would integrate with simulation engines
    // For now, return a mock result

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Circuit execution timeout'));
      }, timeoutMs ?? 30000);

      // Simulate execution
      setTimeout(() => {
        clearTimeout(timeout);

        // Mock result
        const result: ISimulationResult = {
          statevector: new Map(),
          numQubits: entry.circuit.numQubits,
          executionTimeMs: Math.random() * 1000,
          memoryUsageBytes: 0,
        };

        resolve(result);
      }, 10);
    });
  }

  /**
   * Execute a circuit pipeline
   */
  async executePipeline(
    pipeline: ICircuitPipeline,
    input: Circuit | Circuit[],
  ): Promise<IPipelineResult> {
    const startTime = performance.now();
    const stageResults: {
      stage: string;
      durationMs: number;
      success: boolean;
      error?: string;
    }[] = [];

    let currentInput: Circuit | Circuit[] = input;
    const metrics = new Map<string, unknown>();

    for (const stage of pipeline.stages) {
      const stageStart = performance.now();

      try {
        // Execute stage
        const output = await stage.execute(currentInput);

        // Validate output
        if (stage.type === 'validate') {
          const isValid = this.validateCircuit(output);
          if (!isValid) {
            throw new Error('Validation failed');
          }
        }

        // Collect metrics if enabled
        if (pipeline.options?.collectMetrics) {
          const stageMetrics = this.collectMetrics(output, stage.name);
          metrics.set(stage.name, stageMetrics);
        }

        currentInput = output;

        const stageEnd = performance.now();
        stageResults.push({
          stage: stage.name,
          durationMs: stageEnd - stageStart,
          success: true,
        });
      } catch (error) {
        const stageEnd = performance.now();
        stageResults.push({
          stage: stage.name,
          durationMs: stageEnd - stageStart,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        // Stop on error if configured
        if (pipeline.options?.stopOnError !== false) {
          break;
        }

        // Retry if configured
        if (pipeline.options?.maxRetries && pipeline.options.maxRetries > 0) {
          this.logger.log(`Retrying stage ${stage.name}...`);
        }
      }
    }

    const endTime = performance.now();

    return {
      output: currentInput,
      stageResults,
      totalTimeMs: endTime - startTime,
      metrics: pipeline.options?.collectMetrics ? metrics : undefined,
    };
  }

  /**
   * Execute circuits in distributed mode
   */
  async executeDistributed(
    tasks: IDistributedTask[],
    nodes: IExecutionNode[],
  ): Promise<IDistributedResult> {
    const startTime = performance.now();
    const results = new Map<string, ISimulationResult>();
    const distribution = new Map<string, string>();

    // Filter to available nodes
    const availableNodes = nodes.filter((n) => n.status === 'idle');

    if (availableNodes.length === 0) {
      throw new Error('No available execution nodes');
    }

    // Simple round-robin distribution
    let nodeIndex = 0;

    for (const task of tasks) {
      // Select node
      const node = availableNodes[nodeIndex % availableNodes.length];
      nodeIndex++;

      // Assign task
      task.assignedNode = node.id;
      task.status = 'assigned';
      distribution.set(task.taskId, node.id);

      // Execute on node (simulated)
      try {
        task.status = 'running';
        const result = await this.executeDistributedTask(task);

        task.result = result;
        task.status = 'completed';
        results.set(task.taskId, result);
      } catch (error) {
        task.error = error instanceof Error ? error.message : String(error);
        task.status = 'failed';
      }
    }

    const endTime = performance.now();

    // Calculate utilization
    const utilization = new Map<string, number>();
    for (const node of nodes) {
      const nodeTasks = tasks.filter((t) => t.assignedNode === node.id).length;
      const nodeUtil = tasks.length > 0 ? nodeTasks / tasks.length : 0;
      utilization.set(node.id, nodeUtil);
    }

    return {
      results,
      distribution,
      nodeUtilization: utilization,
      totalTimeMs: endTime - startTime,
    };
  }

  /**
   * Execute a distributed task
   */
  private async executeDistributedTask(
    task: IDistributedTask,
  ): Promise<ISimulationResult> {
    // Simulate remote execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      statevector: new Map(),
      numQubits: task.circuit.numQubits,
      executionTimeMs: 100,
      memoryUsageBytes: 0,
    };
  }

  /**
   * Cancel active execution
   */
  cancelExecution(executionId: string): boolean {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): {
    active: boolean;
    aborted?: boolean;
  } {
    const controller = this.activeExecutions.get(executionId);
    return {
      active: !!controller,
      aborted: controller?.signal.aborted,
    };
  }

  /**
   * Create pipeline stage
   */
  createPipelineStage(
    name: string,
    type: IPipelineStage['type'],
    execute: IPipelineStage['execute'],
    parallel?: boolean,
  ): IPipelineStage {
    return {
      name,
      type,
      execute,
      parallel,
    };
  }

  /**
   * Validate circuit output
   */
  private validateCircuit(output: Circuit | Circuit[]): boolean {
    const circuits = Array.isArray(output) ? output : [output];

    for (const circuit of circuits) {
      if (!circuit.numQubits || circuit.numQubits <= 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Collect metrics from output
   */
  private collectMetrics(
    output: Circuit | Circuit[],
    stageName: string,
  ): Record<string, number> {
    const circuits = Array.isArray(output) ? output : [output];

    return {
      circuitCount: circuits.length,
      totalQubits: circuits.reduce((sum, c) => sum + c.numQubits, 0),
      avgQubits: circuits.reduce((sum, c) => sum + c.numQubits, 0) / circuits.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Estimate batch execution time
   */
  estimateBatchTime(
    circuits: ICircuitBatchEntry[],
    options: IBatchExecutionOptions,
  ): number {
    const avgTimePerCircuit = 100; // ms

    switch (options.strategy) {
      case 'parallel':
        const maxParallel = options.maxParallel ?? 4;
        return (circuits.length / maxParallel) * avgTimePerCircuit;
      case 'sequential':
      default:
        return circuits.length * avgTimePerCircuit;
    }
  }
}
