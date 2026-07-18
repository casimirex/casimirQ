/**
 * JobQueue port.
 *
 * A minimal queue abstraction: producers `enqueue` job ids, and a single
 * consumer registers a `handler` via `process`. The default adapter is an
 * in-process queue, but this contract is deliberately transport-agnostic so a
 * Redis/BullMQ (or Postgres `SKIP LOCKED`) adapter can be dropped in later
 * without touching the application layer — the scalability seam of the engine.
 */

/** Invoked once per dequeued job id. Must not throw; errors are handled by the caller. */
export type JobHandler = (jobId: string) => Promise<void>;

export abstract class JobQueue {
  /** Add a job id to the queue for processing. */
  abstract enqueue(jobId: string): Promise<void>;

  /** Register the consumer. Called once at startup. */
  abstract process(handler: JobHandler): void;

  /**
   * Remove a still-queued job id, returning true if it was waiting (and thus
   * cancellable before it starts). Jobs already handed to the consumer cannot
   * be pulled back.
   */
  abstract remove(jobId: string): boolean;
}
