/**
 * Jobs API Controller
 *
 * REST endpoints for job management. A "job" is a simulation run, so jobs are
 * backed by the SimulationsRepository (persisted per-user). Runs are executed
 * synchronously, so every job is already 'completed'.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { EngineType } from '../../simulation-engines/simulation-engines.service';
import { SimulationRunnerService } from '../services/simulation-runner.service';
import { CircuitsRepository } from '../repositories/circuits.repository';
import { SimulationsRepository, StoredSimulation } from '../repositories/simulations.repository';

@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class JobsController {
  constructor(
    private readonly simulations: SimulationsRepository,
    private readonly circuits: CircuitsRepository,
    private readonly simulationRunner: SimulationRunnerService,
  ) {}

  /**
   * List the authenticated user's jobs (most recent first).
   */
  @Get()
  async listJobs(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const { items, total } = await this.simulations.findAll(this.userId(req), {
      page: pageNum,
      limit: limitNum,
    });

    let jobs = items.map(toJob);
    if (status) {
      jobs = jobs.filter((j) => j.status === status);
    }

    return {
      jobs,
      filter: { status },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    };
  }

  /**
   * Get a job's details.
   */
  @Get(':id')
  async getJob(@Param('id') id: string, @Request() req: any) {
    return toJob(await this.requireJob(req, id));
  }

  /**
   * Get a job's status.
   */
  @Get(':id/status')
  async getJobStatus(@Param('id') id: string, @Request() req: any) {
    const job = await this.requireJob(req, id);
    return { id: job.id, status: job.status, progress: 100 };
  }

  /**
   * Get a job's logs (synthesized from the run metadata).
   */
  @Get(':id/logs')
  async getJobLogs(@Param('id') id: string, @Request() req: any, @Query('lines') lines = 100) {
    const job = await this.requireJob(req, id);
    const logs = [
      `[${job.createdAt}] Job ${job.id} started (${job.status})`,
      `[${job.createdAt}] Simulated "${job.circuitName}" on the ${job.engine} engine ` +
        `(${job.numQubits} qubits, ${job.shots} shots)`,
      `[${job.createdAt}] Completed in ${job.executionTimeMs.toFixed(2)} ms`,
    ];
    return { id: job.id, logs: logs.slice(0, Number(lines) || logs.length), lines };
  }

  /**
   * Delete a job from history.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param('id') id: string, @Request() req: any) {
    const deleted = await this.simulations.delete(this.userId(req), id);
    if (!deleted) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return { id, deleted: true };
  }

  /**
   * Retry a job by re-running its original stored circuit.
   */
  @Post(':id/retry')
  async retryJob(@Param('id') id: string, @Request() req: any) {
    const userId = this.userId(req);
    const job = await this.requireJob(req, id);

    if (!job.circuitId) {
      throw new BadRequestException('Cannot retry: job has no saved circuit');
    }
    const circuit = await this.circuits.findById(userId, job.circuitId);
    if (!circuit) {
      throw new BadRequestException('Cannot retry: original circuit no longer exists');
    }

    const run = this.simulationRunner.run(
      { numQubits: circuit.numQubits, operations: circuit.operations },
      { engine: job.engine as EngineType, shots: job.shots },
    );
    const record = await this.simulations.create(userId, {
      circuitId: circuit.id,
      circuitName: circuit.name,
      engine: run.requestedEngine,
      shots: run.shots,
      numQubits: run.numQubits,
      status: run.status,
      results: run.results,
      executionTimeMs: run.metadata.executionTimeMs,
    });

    return { id, newJobId: record.id, status: record.status };
  }

  private async requireJob(req: any, id: string): Promise<StoredSimulation> {
    const job = await this.simulations.findById(this.userId(req), id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  private userId(req: any): string {
    return req?.user?.userId ?? 'anonymous';
  }
}

function toJob(sim: StoredSimulation) {
  return {
    id: sim.id,
    type: 'simulation',
    status: sim.status,
    progress: 100,
    circuitId: sim.circuitId,
    circuitName: sim.circuitName,
    engine: sim.engine,
    shots: sim.shots,
    numQubits: sim.numQubits,
    executionTimeMs: sim.executionTimeMs,
    createdAt: sim.createdAt,
    completedAt: sim.createdAt,
  };
}
