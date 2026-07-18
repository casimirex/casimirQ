/**
 * Jobs API — asynchronous job submission and tracking.
 *
 * Submitting returns immediately (202) with a queued job; clients poll
 * `GET /jobs/:id` for status, progress, and the result once it completes.
 */

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../api/guards/rate-limit.guard';
import { EngineType } from '../../simulation-engines/simulation-engines.service';
import { Job } from '../domain/job';
import { JobsService } from '../application/jobs.service';
import { SimulationJobPayload } from '../application/simulation-job.processor';
import { SubmitSimulationJobDto } from './submit-simulation-job.dto';

/** Shape returned to clients — the persisted job as-is. */
function toJobView(job: Job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

@ApiTags('Jobs')
@ApiBearerAuth('bearer')
@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  /** Submit an asynchronous simulation job. Returns 202 with the queued job. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async submit(@Request() req: unknown, @Body() body: SubmitSimulationJobDto) {
    const payload: SimulationJobPayload = {
      circuitName: body.circuitName ?? 'Async simulation',
      spec: { numQubits: body.numQubits, operations: body.operations },
      config: {
        engine: body.engine as EngineType | undefined,
        shots: body.shots,
        seed: body.seed,
      },
    };
    const job = await this.jobs.submit(this.userId(req), { type: 'simulation', payload });
    return toJobView(job);
  }

  /** List the authenticated user's jobs, newest first. */
  @Get()
  async list(@Request() req: unknown, @Query('page') page = 1, @Query('limit') limit = 20) {
    const { items, total } = await this.jobs.list(this.userId(req), {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    return { jobs: items.map(toJobView), total };
  }

  /** Fetch a single job (status, progress, result). */
  @Get(':id')
  async get(@Request() req: unknown, @Param('id') id: string) {
    const job = await this.jobs.get(this.userId(req), id);
    if (!job) {
      throw new NotFoundException(`Job "${id}" not found`);
    }
    return toJobView(job);
  }

  /** Cancel a still-queued job. */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Request() req: unknown, @Param('id') id: string) {
    const job = await this.jobs.cancel(this.userId(req), id);
    if (!job) {
      throw new NotFoundException(`Job "${id}" not found`);
    }
    return toJobView(job);
  }

  /** Delete a job. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: unknown, @Param('id') id: string) {
    const deleted = await this.jobs.delete(this.userId(req), id);
    if (!deleted) {
      throw new NotFoundException(`Job "${id}" not found`);
    }
  }

  private userId(req: unknown): string {
    return (req as { user?: { userId?: string } })?.user?.userId ?? 'anonymous';
  }
}
