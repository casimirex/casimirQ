/**
 * Postgres Simulations Repository
 *
 * PostgreSQL-backed implementation of SimulationsRepository. The table is
 * created on module init, so no separate migration step is required.
 * Reuses DATABASE_URL / PGSSL configuration.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type QueryResultRow } from 'pg';
import {
  CreateSimulationInput,
  PaginatedSimulations,
  PaginationOptions,
  SimulationResults,
  SimulationsRepository,
  StoredSimulation,
} from './simulations.repository';

interface SimulationRow extends QueryResultRow {
  id: string;
  user_id: string;
  circuit_id: string | null;
  circuit_name: string;
  engine: string;
  shots: number;
  num_qubits: number;
  status: 'completed' | 'failed';
  results: SimulationResults;
  execution_time_ms: string | number;
  created_at: Date;
}

@Injectable()
export class PostgresSimulationsRepository
  extends SimulationsRepository
  implements OnModuleDestroy
{
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

  async create(userId: string, input: CreateSimulationInput): Promise<StoredSimulation> {
    const id = `sim-${randomUUID()}`;
    const { rows } = await this.pool.query<SimulationRow>(
      `INSERT INTO simulations
         (id, user_id, circuit_id, circuit_name, engine, shots, num_qubits, status, results, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
       RETURNING *`,
      [
        id,
        userId,
        input.circuitId,
        input.circuitName,
        input.engine,
        input.shots,
        input.numQubits,
        input.status,
        JSON.stringify(input.results),
        input.executionTimeMs,
      ],
    );
    return this.toStored(rows[0]);
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedSimulations> {
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const offset = (page - 1) * limit;

    const client = await this.pool.connect();
    try {
      const list = await client.query<SimulationRow>(
        `SELECT * FROM simulations
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM simulations WHERE user_id = $1`,
        [userId],
      );
      return {
        items: list.rows.map((r) => this.toStored(r)),
        total: Number(count.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  async findById(userId: string, id: string): Promise<StoredSimulation | null> {
    const { rows } = await this.pool.query<SimulationRow>(
      `SELECT * FROM simulations WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? this.toStored(rows[0]) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM simulations WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  private toStored(row: SimulationRow): StoredSimulation {
    return {
      id: row.id,
      userId: row.user_id,
      circuitId: row.circuit_id,
      circuitName: row.circuit_name,
      engine: row.engine,
      shots: row.shots,
      numQubits: row.num_qubits,
      status: row.status,
      results: row.results,
      executionTimeMs: Number(row.execution_time_ms),
      createdAt: row.created_at.toISOString(),
    };
  }
}
