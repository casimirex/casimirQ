/**
 * Users Repository
 *
 * Persistence contract for user accounts (email + bcrypt password hash).
 * Concrete implementations (in-memory, Postgres) are bound in the ApiModule.
 */

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<StoredUser | null>;
  abstract findById(id: string): Promise<StoredUser | null>;
  /** Create a user. Throws if the email already exists. */
  abstract create(input: CreateUserInput): Promise<StoredUser>;
}
