/**
 * Tests for InMemorySimulationsRepository
 */

import { InMemorySimulationsRepository } from '../in-memory-simulations.repository';
import { CreateSimulationInput } from '../simulations.repository';

const baseInput = (over: Partial<CreateSimulationInput> = {}): CreateSimulationInput => ({
  circuitId: 'circuit-1',
  circuitName: 'Bell',
  engine: 'statevector',
  shots: 1024,
  numQubits: 2,
  status: 'completed',
  results: {
    statevector: [{ state: '00', re: 0.707, im: 0, probability: 0.5 }],
    probabilities: { '00': 0.5, '11': 0.5 },
    counts: { '00': 512, '11': 512 },
  },
  executionTimeMs: 1.5,
  ...over,
});

describe('InMemorySimulationsRepository', () => {
  let repo: InMemorySimulationsRepository;

  beforeEach(() => {
    repo = new InMemorySimulationsRepository();
  });

  it('creates a run with a generated id and timestamp', async () => {
    const run = await repo.create('u1', baseInput());
    expect(run.id).toMatch(/^sim-/);
    expect(run.createdAt).toBeTruthy();
    expect(run.circuitName).toBe('Bell');
    expect(run.results.probabilities['00']).toBe(0.5);
  });

  it('scopes reads to the owning user', async () => {
    const run = await repo.create('u1', baseInput());
    expect(await repo.findById('u1', run.id)).not.toBeNull();
    expect(await repo.findById('u2', run.id)).toBeNull();
  });

  it('lists a user’s runs newest-first, paginated', async () => {
    await repo.create('u1', baseInput({ circuitName: 'A' }));
    await repo.create('u2', baseInput({ circuitName: 'X' }));
    await repo.create('u1', baseInput({ circuitName: 'B' }));

    const all = await repo.findAll('u1', { page: 1, limit: 20 });
    expect(all.total).toBe(2);
    expect(all.items.map((s) => s.circuitName)).toEqual(['B', 'A']);

    const page2 = await repo.findAll('u1', { page: 2, limit: 1 });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].circuitName).toBe('A');
  });

  it('deletes only when owned', async () => {
    const run = await repo.create('u1', baseInput());
    expect(await repo.delete('u2', run.id)).toBe(false);
    expect(await repo.delete('u1', run.id)).toBe(true);
    expect(await repo.findById('u1', run.id)).toBeNull();
  });

  it('stores deep copies so external mutation cannot corrupt state', async () => {
    const input = baseInput();
    const run = await repo.create('u1', input);
    input.results.probabilities['00'] = 999;
    const fetched = await repo.findById('u1', run.id);
    expect(fetched?.results.probabilities['00']).toBe(0.5);
  });
});
