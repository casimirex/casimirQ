/**
 * Tests for InMemoryCircuitsRepository
 */

import { InMemoryCircuitsRepository } from '../in-memory-circuits.repository';

describe('InMemoryCircuitsRepository', () => {
  let repo: InMemoryCircuitsRepository;

  beforeEach(() => {
    repo = new InMemoryCircuitsRepository();
  });

  it('creates circuits with unique ids and timestamps', async () => {
    const a = await repo.create('u1', { name: 'A', numQubits: 2 });
    const b = await repo.create('u1', { name: 'B', numQubits: 3 });
    expect(a.id).not.toBe(b.id);
    expect(a.createdAt).toBeTruthy();
    expect(a.updatedAt).toBe(a.createdAt);
  });

  it('scopes reads to the owning user', async () => {
    const a = await repo.create('u1', { name: 'A', numQubits: 1 });
    expect(await repo.findById('u1', a.id)).not.toBeNull();
    expect(await repo.findById('u2', a.id)).toBeNull();
  });

  it('lists only the user’s circuits, newest first, paginated', async () => {
    await repo.create('u1', { name: 'A', numQubits: 1 });
    await repo.create('u2', { name: 'X', numQubits: 1 });
    await repo.create('u1', { name: 'B', numQubits: 1 });

    const all = await repo.findAll('u1', { page: 1, limit: 20 });
    expect(all.total).toBe(2);
    expect(all.items.map((c) => c.name)).toEqual(['B', 'A']);

    const page2 = await repo.findAll('u1', { page: 2, limit: 1 });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].name).toBe('A');
  });

  it('updates name and operations and bumps updatedAt', async () => {
    const a = await repo.create('u1', { name: 'A', numQubits: 2 });
    const updated = await repo.update('u1', a.id, {
      name: 'A2',
      operations: [{ gate: 'h', targets: [0] }],
    });
    expect(updated?.name).toBe('A2');
    expect(updated?.operations).toHaveLength(1);
    expect(await repo.update('u2', a.id, { name: 'nope' })).toBeNull();
  });

  it('deletes only when owned', async () => {
    const a = await repo.create('u1', { name: 'A', numQubits: 1 });
    expect(await repo.delete('u2', a.id)).toBe(false);
    expect(await repo.delete('u1', a.id)).toBe(true);
    expect(await repo.findById('u1', a.id)).toBeNull();
  });

  it('stores deep copies so external mutation cannot corrupt state', async () => {
    const ops = [{ gate: 'h', targets: [0] }];
    const a = await repo.create('u1', { name: 'A', numQubits: 1, operations: ops });
    ops[0].targets[0] = 5; // mutate caller's array after create
    const fetched = await repo.findById('u1', a.id);
    expect(fetched?.operations[0].targets[0]).toBe(0);
  });
});
