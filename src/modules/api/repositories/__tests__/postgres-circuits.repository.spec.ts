/**
 * Integration tests for PostgresCircuitsRepository.
 *
 * These run only when TEST_DATABASE_URL is set (a reachable Postgres), e.g.:
 *   TEST_DATABASE_URL=postgres://casimir:casimir@localhost:5433/casimirq \
 *     npx jest postgres-circuits
 * Otherwise the suite is skipped so the default test run needs no database.
 */

import { PostgresCircuitsRepository } from '../postgres-circuits.repository';

const url = process.env.TEST_DATABASE_URL;
const describeIfDb = url ? describe : describe.skip;

describeIfDb('PostgresCircuitsRepository (integration)', () => {
  let repo: PostgresCircuitsRepository;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    repo = new PostgresCircuitsRepository();
    await repo.onModuleInit();
  });

  afterAll(async () => {
    await repo.onModuleDestroy();
  });

  beforeEach(async () => {
    const client = await repo.getClient();
    try {
      await client.query('TRUNCATE TABLE circuits');
    } finally {
      client.release();
    }
  });

  it('persists and reads back a circuit', async () => {
    const created = await repo.create('u1', {
      name: 'Bell',
      numQubits: 2,
      operations: [
        { gate: 'h', targets: [0] },
        { gate: 'cnot', targets: [0, 1] },
      ],
    });
    expect(created.id).toMatch(/^circuit-/);

    const fetched = await repo.findById('u1', created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Bell');
    expect(fetched?.numQubits).toBe(2);
    expect(fetched?.operations).toHaveLength(2);
    expect(fetched?.operations[1]).toEqual({ gate: 'cnot', targets: [0, 1] });
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

  it('updates name and operations (partial patch supported)', async () => {
    const a = await repo.create('u1', {
      name: 'A',
      numQubits: 2,
      operations: [{ gate: 'h', targets: [0] }],
    });

    const renamed = await repo.update('u1', a.id, { name: 'A2' });
    expect(renamed?.name).toBe('A2');
    expect(renamed?.operations).toHaveLength(1); // operations preserved

    const reops = await repo.update('u1', a.id, {
      operations: [
        { gate: 'x', targets: [1] },
        { gate: 'cnot', targets: [0, 1] },
      ],
    });
    expect(reops?.name).toBe('A2'); // name preserved
    expect(reops?.operations).toHaveLength(2);

    expect(await repo.update('u2', a.id, { name: 'nope' })).toBeNull();
  });

  it('deletes only when owned', async () => {
    const a = await repo.create('u1', { name: 'A', numQubits: 1 });
    expect(await repo.delete('u2', a.id)).toBe(false);
    expect(await repo.delete('u1', a.id)).toBe(true);
    expect(await repo.findById('u1', a.id)).toBeNull();
  });
});
