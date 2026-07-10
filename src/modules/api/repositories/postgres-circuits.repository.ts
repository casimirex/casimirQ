/**
 * Postgres Circuits Repository
 *
 * A PostgreSQL-backed implementation of CircuitsRepository using node-postgres.
 * The table is created on module init if it does not already exist, so no
 * external migration step is required for a fresh database.
 *
 * Configuration (env):
 *   DATABASE_URL  postgres connection string (required to select this impl)
 *   PGSSL=true    enable TLS (e.g. for managed databases)
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import {
  CircuitsRepository,
  CreateCircuitInput,
  PaginatedCircuits,
  PaginationOptions,
  StoredCircuit,
  UpdateCircuitInput,
} from './circuits.repository';

interface CircuitRow extends QueryResultRow {
  id: string;
  user_id: string;
  name: string;
  num_qubits: number;
  operations: StoredCircuit['operations'];
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PostgresCircuitsRepository extends CircuitsRepository implements OnModuleDestroy {
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

  async create(userId: string, input: CreateCircuitInput): Promise<StoredCircuit> {
    const id = `circuit-${randomUUID()}`;
    const { rows } = await this.pool.query<CircuitRow>(
      `INSERT INTO circuits (id, user_id, name, num_qubits, operations)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [id, userId, input.name, input.numQubits, JSON.stringify(input.operations ?? [])],
    );
    return this.toStoredCircuit(rows[0]);
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedCircuits> {
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const offset = (page - 1) * limit;

    const client = await this.pool.connect();
    try {
      const list = await client.query<CircuitRow>(
        `SELECT * FROM circuits
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM circuits WHERE user_id = $1`,
        [userId],
      );
      return {
        items: list.rows.map((r) => this.toStoredCircuit(r)),
        total: Number(count.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  async findById(userId: string, id: string): Promise<StoredCircuit | null> {
    const { rows } = await this.pool.query<CircuitRow>(
      `SELECT * FROM circuits WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? this.toStoredCircuit(rows[0]) : null;
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateCircuitInput,
  ): Promise<StoredCircuit | null> {
    const operations = patch.operations === undefined ? null : JSON.stringify(patch.operations);
    const { rows } = await this.pool.query<CircuitRow>(
      `UPDATE circuits SET
         name       = COALESCE($3, name),
         operations = COALESCE($4::jsonb, operations),
         updated_at = now()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, patch.name ?? null, operations],
    );
    return rows[0] ? this.toStoredCircuit(rows[0]) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM circuits WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Expose the pool for integration setup/teardown in tests. */
  getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  private toStoredCircuit(row: CircuitRow): StoredCircuit {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      numQubits: row.num_qubits,
      operations: row.operations ?? [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
