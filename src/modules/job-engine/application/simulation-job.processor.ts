/**
 * SimulationJobProcessor.
 *
 * Runs a `simulation` job. By default it executes on the shared
 * SimulationRunnerService (exact, with a statevector). If the payload names a
 * `backendId`, it runs on that backend instead — so an async job can target any
 * execution backend (a noisy simulator, the emulated QPU, or a real device).
 * Either way it records the run in the simulation history and returns a uniform
 * result shape.
 */

import { Injectable } from '@nestjs/common';
import {
  CircuitSpec,
  SimulationRunConfig,
  SimulationRunResult,
  SimulationRunnerService,
} from '../../api/services/simulation-runner.service';
import { SimulationsRepository } from '../../api/repositories/simulations.repository';
import { NoiseSpec } from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';
import { BackendRegistry } from '../../backends/backend-registry.service';
import { Job } from '../domain/job';
import { JobContext, JobProcessor } from './job-processor';

/** The payload shape for a `simulation` job. */
export interface SimulationJobPayload {
  circuitName: string;
  spec: CircuitSpec;
  config: SimulationRunConfig;
  /** Optional backend to run on; absent = the default runner. */
  backendId?: string;
  /** Optional noise channels, for backends that support them. */
  noise?: NoiseSpec[];
}

/**
 * Uniform result shape for a simulation job. The runner path yields a
 * SimulationRunResult (assignable here); the backend path yields the same shape
 * with extra, backend-specific metadata.
 */
interface JobSimulationResult {
  status: string;
  numQubits: number;
  requestedEngine: string;
  shots: number;
  results: SimulationRunResult['results'];
  metadata: { executionTimeMs: number; memoryUsageBytes: number; [key: string]: unknown };
}

@Injectable()
export class SimulationJobProcessor extends JobProcessor {
  readonly type = 'simulation' as const;

  constructor(
    private readonly runner: SimulationRunnerService,
    private readonly simulations: SimulationsRepository,
    private readonly backends: BackendRegistry,
  ) {
    super();
  }

  async run(job: Job, ctx: JobContext): Promise<unknown> {
    const { circuitName, spec, config, backendId, noise } = job.payload as SimulationJobPayload;

    // Validate up front so bad input fails fast with a clear message.
    this.runner.buildCircuit(spec);
    await ctx.reportProgress(0.1);

    const result: JobSimulationResult = backendId
      ? await this.runOnBackend(spec, backendId, config, noise)
      : this.runner.run(spec, config);

    await ctx.reportProgress(0.9);

    // Mirror into the simulation history so async runs appear alongside sync ones.
    await this.simulations.create(job.userId, {
      circuitId: null,
      circuitName: circuitName || 'Async simulation',
      engine: result.requestedEngine,
      shots: result.shots,
      numQubits: result.numQubits,
      status: 'completed',
      results: result.results,
      executionTimeMs: result.metadata.executionTimeMs,
    });

    return result;
  }

  /** Run on a named backend and adapt to the uniform result shape. */
  private async runOnBackend(
    spec: CircuitSpec,
    backendId: string,
    config: SimulationRunConfig,
    noise: NoiseSpec[] | undefined,
  ): Promise<JobSimulationResult> {
    const backend = this.backends.get(backendId);
    if (!backend) {
      throw new Error(`Backend "${backendId}" not found`);
    }
    if (!backend.isAvailable()) {
      throw new Error(`Backend "${backendId}" is not available`);
    }
    if (spec.numQubits > backend.capabilities.maxQubits) {
      throw new Error(
        `Backend "${backendId}" supports up to ${backend.capabilities.maxQubits} qubits (got ${spec.numQubits})`,
      );
    }

    const run = await backend.run(spec, { shots: config.shots, seed: config.seed, noise });

    return {
      status: 'completed',
      numQubits: run.numQubits,
      // Report the backend id as the "engine" so history/UI show where it ran.
      requestedEngine: backendId as SimulationRunResult['requestedEngine'],
      shots: run.shots,
      // Backends return counts/probabilities but not a statevector.
      results: { statevector: [], probabilities: run.probabilities, counts: run.counts },
      metadata: {
        ...run.metadata,
        executionTimeMs: Number(run.metadata.executionTimeMs ?? 0),
        memoryUsageBytes: 0,
        backendId,
      },
    };
  }
}
