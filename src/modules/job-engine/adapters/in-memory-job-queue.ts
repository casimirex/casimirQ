/**
 * In-memory JobQueue adapter.
 *
 * A FIFO queue processed on the event loop with bounded concurrency. It is the
 * default binding for single-node deployments and tests. Because it implements
 * the JobQueue port, a distributed adapter (Redis/BullMQ, Postgres SKIP LOCKED)
 * can replace it with no change to the application layer.
 *
 * Note: work runs in this process. CPU-bound processors still occupy the event
 * loop while executing; moving to worker threads or an external queue is the
 * scaling path this abstraction is designed to enable.
 */

import { Injectable } from '@nestjs/common';
import { JobHandler, JobQueue } from '../ports/job-queue.port';

@Injectable()
export class InMemoryJobQueue extends JobQueue {
  private readonly waiting: string[] = [];
  private handler: JobHandler | null = null;
  private active = 0;

  /** Maximum jobs processed concurrently. */
  constructor(private readonly concurrency = 2) {
    super();
  }

  async enqueue(jobId: string): Promise<void> {
    this.waiting.push(jobId);
    this.pump();
  }

  process(handler: JobHandler): void {
    this.handler = handler;
    this.pump();
  }

  remove(jobId: string): boolean {
    const index = this.waiting.indexOf(jobId);
    if (index === -1) {
      return false;
    }
    this.waiting.splice(index, 1);
    return true;
  }

  /** Start as many waiting jobs as concurrency allows. */
  private pump(): void {
    while (this.handler && this.active < this.concurrency && this.waiting.length > 0) {
      const jobId = this.waiting.shift() as string;
      this.active += 1;
      // Defer to the next tick so `enqueue`/`submit` return before work starts.
      setImmediate(() => {
        void Promise.resolve(this.handler?.(jobId))
          .catch(() => undefined)
          .finally(() => {
            this.active -= 1;
            this.pump();
          });
      });
    }
  }
}
