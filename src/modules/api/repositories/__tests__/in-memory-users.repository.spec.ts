/**
 * Tests for InMemoryUsersRepository
 */

import { ConflictException } from '@nestjs/common';
import { InMemoryUsersRepository } from '../in-memory-users.repository';

describe('InMemoryUsersRepository', () => {
  let repo: InMemoryUsersRepository;

  beforeEach(() => {
    repo = new InMemoryUsersRepository();
  });

  it('creates a user retrievable by email and id', async () => {
    const user = await repo.create({ email: 'a@example.com', passwordHash: 'hash' });
    expect(user.id).toMatch(/^user-/);
    expect(await repo.findByEmail('a@example.com')).toMatchObject({ id: user.id });
    expect(await repo.findById(user.id)).toMatchObject({ email: 'a@example.com' });
  });

  it('returns null for unknown email/id', async () => {
    expect(await repo.findByEmail('nope@example.com')).toBeNull();
    expect(await repo.findById('nope')).toBeNull();
  });

  it('rejects a duplicate email', async () => {
    await repo.create({ email: 'a@example.com', passwordHash: 'h1' });
    await expect(
      repo.create({ email: 'a@example.com', passwordHash: 'h2' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
