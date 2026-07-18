import { JobsService } from '../jobs.service';
import { InMemoryJobsRepository } from '../../adapters/in-memory-jobs.repository';
import { InMemoryJobQueue } from '../../adapters/in-memory-job-queue';
import { JobContext, JobProcessor } from '../job-processor';
import { Job, JobStatus } from '../../domain/job';
import { JobsRepository } from '../../ports/jobs-repository.port';

/** A processor that reports progress and echoes its payload. */
class EchoProcessor extends JobProcessor {
  readonly type = 'simulation' as const;
  async run(job: Job, ctx: JobContext): Promise<unknown> {
    await ctx.reportProgress(0.5);
    return { echoed: job.payload };
  }
}

/** A processor that always throws. */
class FailingProcessor extends JobProcessor {
  readonly type = 'simulation' as const;
  async run(): Promise<unknown> {
    throw new Error('boom');
  }
}

async function waitForStatus(
  repo: JobsRepository,
  userId: string,
  id: string,
  status: JobStatus,
  timeoutMs = 1000,
): Promise<Job> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const job = await repo.findById(userId, id);
    if (job && job.status === status) return job;
    if (Date.now() > deadline) {
      throw new Error(`job ${id} did not reach "${status}" (last: ${job?.status})`);
    }
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe('JobsService', () => {
  const USER = 'user-1';

  function build(processor: JobProcessor, start = true) {
    const repo = new InMemoryJobsRepository();
    const queue = new InMemoryJobQueue(2);
    const service = new JobsService(repo, queue, [processor]);
    if (start) service.onModuleInit();
    return { repo, queue, service };
  }

  it('submits a job in the queued state', async () => {
    const { service } = build(new EchoProcessor(), false);
    const job = await service.submit(USER, { type: 'simulation', payload: { n: 1 } });
    expect(job.id).toMatch(/^job-/);
    expect(job.status).toBe('queued');
    expect(job.progress).toBe(0);
  });

  it('processes a job to completion and stores the result', async () => {
    const { repo, service } = build(new EchoProcessor());
    const job = await service.submit(USER, { type: 'simulation', payload: { n: 2 } });

    const done = await waitForStatus(repo, USER, job.id, 'completed');
    expect(done.progress).toBe(1);
    expect(done.result).toEqual({ echoed: { n: 2 } });
    expect(done.startedAt).not.toBeNull();
    expect(done.finishedAt).not.toBeNull();
  });

  it('captures a processor failure onto the job', async () => {
    const { repo, service } = build(new FailingProcessor());
    const job = await service.submit(USER, { type: 'simulation', payload: {} });

    const failed = await waitForStatus(repo, USER, job.id, 'failed');
    expect(failed.error).toBe('boom');
    expect(failed.result).toBeNull();
  });

  it('cancels a job that is still queued', async () => {
    // Do not start the worker, so the job stays queued and is cancellable.
    const { service } = build(new EchoProcessor(), false);
    const job = await service.submit(USER, { type: 'simulation', payload: {} });

    const cancelled = await service.cancel(USER, job.id);
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.finishedAt).not.toBeNull();
  });

  it('scopes reads and deletes to the owning user', async () => {
    const { service } = build(new EchoProcessor(), false);
    const job = await service.submit(USER, { type: 'simulation', payload: {} });

    expect(await service.get('someone-else', job.id)).toBeNull();
    expect(await service.delete('someone-else', job.id)).toBe(false);
    expect(await service.delete(USER, job.id)).toBe(true);
    expect(await service.get(USER, job.id)).toBeNull();
  });

  it('rejects an unknown job type', async () => {
    const { service } = build(new EchoProcessor(), false);
    await expect(
      // @ts-expect-error deliberately invalid type
      service.submit(USER, { type: 'nope', payload: {} }),
    ).rejects.toThrow(/No processor/);
  });
});
