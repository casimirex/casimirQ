/**
 * Tests for InMemoryBatchesRepository
 */

import { InMemoryBatchesRepository } from '../in-memory-batches.repository';
import { CreateBatchInput } from '../batches.repository';

const input = (over: Partial<CreateBatchInput> = {}): CreateBatchInput => ({
  status: 'completed',
  total: 1,
  succeeded: 1,
  failed: 0,
  entries: [{ circuitId: 'c1', circuitName: 'A', simulationId: 'sim-1', status: 'completed' }],
  ...over,
});

describe('InMemoryBatchesRepository', () => {
  let repo: InMemoryBatchesRepository;

  beforeEach(() => {
    repo = new InMemoryBatchesRepository();
  });

  it('creates and reads back a batch', async () => {
    const b = await repo.create('u1', input());
    expect(b.id).toMatch(/^batch-/);
    expect(await repo.findById('u1', b.id)).toMatchObject({ status: 'completed', total: 1 });
  });

  it('scopes reads to the owning user', async () => {
    const b = await repo.create('u1', input());
    expect(await repo.findById('u2', b.id)).toBeNull();
  });

  it('lists a user’s batches newest-first, paginated', async () => {
    await repo.create('u1', input({ total: 1 }));
    await repo.create('u2', input());
    await repo.create('u1', input({ total: 2 }));
    const all = await repo.findAll('u1', { page: 1, limit: 20 });
    expect(all.total).toBe(2);
    expect(all.items[0].total).toBe(2); // newest first
  });

  it('stores deep copies of entries', async () => {
    const src = input();
    const b = await repo.create('u1', src);
    src.entries[0].circuitName = 'MUTATED';
    const fetched = await repo.findById('u1', b.id);
    expect(fetched?.entries[0].circuitName).toBe('A');
  });
});
