/**
 * Postgres Users Repository
 *
 * PostgreSQL-backed user store. Creates the table on module init; the email
 * column is unique (a duplicate insert surfaces as a ConflictException).
 * Reuses DATABASE_URL / PGSSL configuration.
 */

import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type QueryResultRow } from 'pg';
import { CreateUserInput, StoredUser, UsersRepository } from './users.repository';

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

/** Postgres unique-violation error code. */
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class PostgresUsersRepository extends UsersRepository implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query<UserRow>(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    return rows[0] ? this.toStored(rows[0]) : null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
    return rows[0] ? this.toStored(rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<StoredUser> {
    try {
      const { rows } = await this.pool.query<UserRow>(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [`user-${randomUUID()}`, input.email, input.passwordHash],
      );
      return this.toStored(rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  private toStored(row: UserRow): StoredUser {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at.toISOString(),
    };
  }
}
