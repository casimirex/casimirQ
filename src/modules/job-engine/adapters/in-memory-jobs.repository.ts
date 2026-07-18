/**
 * In-memory JobsRepository adapter.
 *
 * Process-local, Map-backed storage used when no DATABASE_URL is configured and
 * in tests. Returns deep copies so callers can't mutate stored state.
 */

import { Injectable } from '@nestjs/common';
import { Job, NewJob, createJob } from '../domain/job';
import {
  JobPatch,
  JobsRepository,
  PaginatedJobs,
  PaginationOptions,
} from '../ports/jobs-repository.port';

@Injectable()
export class InMemoryJobsRepository extends JobsRepository {
  private readonly jobs = new Map<string, Job>();
  private order = 0;
  private readonly sequence = new Map<string, number>();

  async create(userId: string, input: NewJob): Promise<Job> {
    const job = createJob(userId, input);
    this.jobs.set(job.id, job);
    this.sequence.set(job.id, this.order++);
    return this.clone(job);
  }

  async findById(userId: string, id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    return job && job.userId === userId ? this.clone(job) : null;
  }

  async findForProcessing(id: string): Promise<Job | null> {
    const job = this.jobs.get(id);
    return job ? this.clone(job) : null;
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedJobs> {
    const owned = Array.from(this.jobs.values())
      .filter((j) => j.userId === userId)
      .sort((a, b) => (this.sequence.get(b.id) ?? 0) - (this.sequence.get(a.id) ?? 0));

    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const start = (page - 1) * limit;
    return {
      items: owned.slice(start, start + limit).map((j) => this.clone(j)),
      total: owned.length,
    };
  }

  async patch(id: string, patch: JobPatch): Promise<Job | null> {
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    return this.clone(job);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.userId !== userId) {
      return false;
    }
    this.sequence.delete(id);
    return this.jobs.delete(id);
  }

  private clone(job: Job): Job {
    return structuredClone(job);
  }
}
