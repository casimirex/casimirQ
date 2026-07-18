/**
 * JobProcessor abstraction.
 *
 * Each processor handles exactly one JobType. Processors are registered with the
 * engine through the `JOB_PROCESSORS` token, so adding a new kind of async work
 * is additive: implement a processor, provide it, done — no change to the queue,
 * repository, service, or controller.
 */

import { Job, JobType } from '../domain/job';

/** DI token for the array of registered processors. */
export const JOB_PROCESSORS = Symbol('JOB_PROCESSORS');

/** Context handed to a processor while it runs a job. */
export interface JobContext {
  /** Report progress in [0, 1]; persisted so clients can poll it. */
  reportProgress(progress: number): Promise<void>;
}

export abstract class JobProcessor {
  /** The job type this processor handles. */
  abstract readonly type: JobType;

  /** Execute the job and return its result (persisted as `job.result`). */
  abstract run(job: Job, ctx: JobContext): Promise<unknown>;
}
