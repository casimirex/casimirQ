/**
 * JobsService — the application core of the job engine.
 *
 * Responsibilities:
 *   - submit: persist a queued job and enqueue it;
 *   - get/list: user-scoped reads for the API;
 *   - cancel: pull a still-queued job before it runs;
 *   - execute: the worker loop that runs a job through its processor and records
 *     the outcome.
 *
 * It depends only on ports (JobsRepository, JobQueue) and the registered
 * processors — never on a concrete adapter — so storage and transport are
 * swappable.
 */

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, JobType, NewJob, isTerminal } from '../domain/job';
import { JobsRepository, PaginatedJobs, PaginationOptions } from '../ports/jobs-repository.port';
import { JobQueue } from '../ports/job-queue.port';
import { JOB_PROCESSORS, JobProcessor } from './job-processor';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly processors: Map<JobType, JobProcessor>;

  constructor(
    private readonly repository: JobsRepository,
    private readonly queue: JobQueue,
    @Inject(JOB_PROCESSORS) processors: JobProcessor[],
  ) {
    this.processors = new Map(processors.map((p) => [p.type, p]));
  }

  /** Register the worker loop once the module is ready. */
  onModuleInit(): void {
    this.queue.process((jobId) => this.execute(jobId));
  }

  /** Submit a new job: persisted as `queued`, then enqueued for processing. */
  async submit(userId: string, input: NewJob): Promise<Job> {
    if (!this.processors.has(input.type)) {
      throw new Error(`No processor registered for job type "${input.type}"`);
    }
    const job = await this.repository.create(userId, input);
    await this.queue.enqueue(job.id);
    return job;
  }

  /** Read a user's job. */
  get(userId: string, id: string): Promise<Job | null> {
    return this.repository.findById(userId, id);
  }

  /** List a user's jobs, newest first. */
  list(userId: string, options: PaginationOptions): Promise<PaginatedJobs> {
    return this.repository.findAll(userId, options);
  }

  /**
   * Cancel a job. A queued job is pulled from the queue and marked cancelled; a
   * running or already-terminal job is returned unchanged (it cannot be pulled
   * back). Returns null if the job doesn't belong to the user.
   */
  async cancel(userId: string, id: string): Promise<Job | null> {
    const job = await this.repository.findById(userId, id);
    if (!job) {
      return null;
    }
    if (job.status !== 'queued') {
      return job;
    }
    this.queue.remove(job.id);
    const now = new Date().toISOString();
    return this.repository.patch(job.id, { status: 'cancelled', finishedAt: now });
  }

  /** Delete a user's job. */
  delete(userId: string, id: string): Promise<boolean> {
    return this.repository.delete(userId, id);
  }

  /**
   * The worker: run a single job to completion. Invoked by the queue. Never
   * throws — failures are captured onto the job.
   */
  private async execute(jobId: string): Promise<void> {
    const job = await this.repository.findForProcessing(jobId);
    if (!job) {
      this.logger.warn(`Job ${jobId} vanished before processing`);
      return;
    }
    // A cancel may have landed between enqueue and dequeue.
    if (isTerminal(job.status)) {
      return;
    }

    const processor = this.processors.get(job.type);
    if (!processor) {
      await this.repository.patch(job.id, {
        status: 'failed',
        error: `No processor for job type "${job.type}"`,
        finishedAt: new Date().toISOString(),
      });
      return;
    }

    await this.repository.patch(job.id, {
      status: 'running',
      startedAt: new Date().toISOString(),
      progress: 0,
    });

    try {
      const result = await processor.run(job, {
        reportProgress: async (progress) => {
          await this.repository.patch(job.id, {
            progress: Math.max(0, Math.min(1, progress)),
          });
        },
      });
      await this.repository.patch(job.id, {
        status: 'completed',
        progress: 1,
        result,
        finishedAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id} failed: ${message}`);
      await this.repository.patch(job.id, {
        status: 'failed',
        error: message,
        finishedAt: new Date().toISOString(),
      });
    }
  }
}
