/**
 * JobEngineModule.
 *
 * Wires the asynchronous job engine: ports bound to their default adapters
 * (in-memory, or Postgres when DATABASE_URL is set), the orchestrating service,
 * and the registered processors. Imports ApiModule for the guards, the
 * simulation runner, and the simulations repository the processor reuses.
 */

import { Module } from '@nestjs/common';
import { ApiModule } from '../api/api.module';
import { SimulationRunnerService } from '../api/services/simulation-runner.service';
import { SimulationsRepository } from '../api/repositories/simulations.repository';
import { BackendsModule } from '../backends/backends.module';
import { BackendRegistry } from '../backends/backend-registry.service';

import { JobsRepository } from './ports/jobs-repository.port';
import { JobQueue } from './ports/job-queue.port';
import { InMemoryJobsRepository } from './adapters/in-memory-jobs.repository';
import { PostgresJobsRepository } from './adapters/postgres-jobs.repository';
import { InMemoryJobQueue } from './adapters/in-memory-job-queue';
import { JobsService } from './application/jobs.service';
import { JOB_PROCESSORS } from './application/job-processor';
import { SimulationJobProcessor } from './application/simulation-job.processor';
import { JobsController } from './interface/jobs.controller';

@Module({
  imports: [ApiModule, BackendsModule],
  controllers: [JobsController],
  providers: [
    // Storage adapter: Postgres when configured, otherwise in-memory.
    {
      provide: JobsRepository,
      useClass: process.env.DATABASE_URL ? PostgresJobsRepository : InMemoryJobsRepository,
    },
    // Queue adapter: in-process by default (swappable for a distributed queue).
    // Instantiated via a factory so the concurrency argument isn't DI-resolved.
    { provide: JobQueue, useFactory: () => new InMemoryJobQueue(2) },
    // Processors handling each job type.
    {
      provide: SimulationJobProcessor,
      useFactory: (
        runner: SimulationRunnerService,
        sims: SimulationsRepository,
        backends: BackendRegistry,
      ) => new SimulationJobProcessor(runner, sims, backends),
      inject: [SimulationRunnerService, SimulationsRepository, BackendRegistry],
    },
    {
      provide: JOB_PROCESSORS,
      useFactory: (sim: SimulationJobProcessor) => [sim],
      inject: [SimulationJobProcessor],
    },
    JobsService,
  ],
  exports: [JobsService],
})
export class JobEngineModule {}
