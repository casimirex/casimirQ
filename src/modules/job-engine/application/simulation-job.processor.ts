/**
 * SimulationJobProcessor.
 *
 * Runs a `simulation` job: it rebuilds the circuit, executes it on the shared
 * SimulationRunnerService, records the run in the simulation history for
 * continuity with the synchronous path, and returns the serialized result.
 *
 * The heavy computation is delegated to the existing runner; this class only
 * adapts a Job into a simulation call and back.
 */

import { Injectable } from '@nestjs/common';
import {
  CircuitSpec,
  SimulationRunConfig,
  SimulationRunnerService,
} from '../../api/services/simulation-runner.service';
import { SimulationsRepository } from '../../api/repositories/simulations.repository';
import { Job } from '../domain/job';
import { JobContext, JobProcessor } from './job-processor';

/** The payload shape for a `simulation` job. */
export interface SimulationJobPayload {
  circuitName: string;
  spec: CircuitSpec;
  config: SimulationRunConfig;
}

@Injectable()
export class SimulationJobProcessor extends JobProcessor {
  readonly type = 'simulation' as const;

  constructor(
    private readonly runner: SimulationRunnerService,
    private readonly simulations: SimulationsRepository,
  ) {
    super();
  }

  async run(job: Job, ctx: JobContext): Promise<unknown> {
    const { circuitName, spec, config } = job.payload as SimulationJobPayload;

    // Validate up front so bad input fails fast with a clear message.
    this.runner.buildCircuit(spec);
    await ctx.reportProgress(0.1);

    const run = this.runner.run(spec, config);
    await ctx.reportProgress(0.9);

    // Mirror into the simulation history so async runs appear alongside sync ones.
    await this.simulations.create(job.userId, {
      circuitId: null,
      circuitName: circuitName || 'Async simulation',
      engine: run.requestedEngine,
      shots: run.shots,
      numQubits: run.numQubits,
      status: 'completed',
      results: run.results,
      executionTimeMs: run.metadata.executionTimeMs,
    });

    return run;
  }
}
