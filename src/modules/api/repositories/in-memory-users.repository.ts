/**
 * In-Memory Users Repository
 *
 * Process-local user store for development and tests. Emails are the unique
 * key; they are expected to be normalized (lowercased/trimmed) by the caller.
 */

import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserInput, StoredUser, UsersRepository } from './users.repository';

@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  private readonly byId = new Map<string, StoredUser>();
  private readonly byEmail = new Map<string, StoredUser>();
  private sequence = 0;

  async findByEmail(email: string): Promise<StoredUser | null> {
    return this.byEmail.get(email) ?? null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    return this.byId.get(id) ?? null;
  }

  async create(input: CreateUserInput): Promise<StoredUser> {
    if (this.byEmail.has(input.email)) {
      throw new ConflictException('Email already registered');
    }
    this.sequence += 1;
    const user: StoredUser = {
      id: `user-${Date.now()}-${this.sequence}`,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.byId.set(user.id, user);
    this.byEmail.set(user.email, user);
    return { ...user };
  }
}
