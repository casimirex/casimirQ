/**
 * JobsRepository port.
 *
 * Persistence contract for jobs. Two access patterns:
 *   - user-scoped reads/writes for the API layer (a user only sees their jobs);
 *   - an unscoped read + update used by the worker, which processes any job.
 *
 * Concrete adapters (in-memory, Postgres) are bound in the JobEngineModule, so
 * the application layer depends only on this abstract class.
 */

import { Job, JobStatus, NewJob } from '../domain/job';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedJobs {
  items: Job[];
  total: number;
}

/** Fields a processor may mutate on a job as it runs. */
export interface JobPatch {
  status?: JobStatus;
  progress?: number;
  result?: unknown;
  error?: string | null;
  startedAt?: string;
  finishedAt?: string;
}

export abstract class JobsRepository {
  /** Create a new job for a user. */
  abstract create(userId: string, input: NewJob): Promise<Job>;

  /** Read a job owned by `userId`, or null. */
  abstract findById(userId: string, id: string): Promise<Job | null>;

  /** List a user's jobs, newest first. */
  abstract findAll(userId: string, options: PaginationOptions): Promise<PaginatedJobs>;

  /** Read a job by id without a user scope (worker use). */
  abstract findForProcessing(id: string): Promise<Job | null>;

  /** Apply a patch to a job by id (worker use). Returns the updated job. */
  abstract patch(id: string, patch: JobPatch): Promise<Job | null>;

  /** Delete a job owned by `userId`. */
  abstract delete(userId: string, id: string): Promise<boolean>;
}
