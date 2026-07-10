/**
 * Postgres Batches Repository
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool, type QueryResultRow } from 'pg';
import {
  BatchEntry,
  BatchesRepository,
  CreateBatchInput,
  PaginatedBatches,
  PaginationOptions,
  StoredBatch,
} from './batches.repository';

interface BatchRow extends QueryResultRow {
  id: string;
  user_id: string;
  status: StoredBatch['status'];
  total: number;
  succeeded: number;
  failed: number;
  entries: BatchEntry[];
  created_at: Date;
}

@Injectable()
export class PostgresBatchesRepository
  extends BatchesRepository
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PostgresBatchesRepository.name);
  private readonly pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        status      TEXT NOT NULL,
        total       INTEGER NOT NULL,
        succeeded   INTEGER NOT NULL,
        failed      INTEGER NOT NULL,
        entries     JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_batches_user_created
        ON batches (user_id, created_at DESC, id DESC);
    `);
    this.logger.log('Batches table ready');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async create(userId: string, input: CreateBatchInput): Promise<StoredBatch> {
    const id = `batch-${randomUUID()}`;
    const { rows } = await this.pool.query<BatchRow>(
      `INSERT INTO batches (id, user_id, status, total, succeeded, failed, entries)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [
        id,
        userId,
        input.status,
        input.total,
        input.succeeded,
        input.failed,
        JSON.stringify(input.entries),
      ],
    );
    return this.toStored(rows[0]);
  }

  async findById(userId: string, id: string): Promise<StoredBatch | null> {
    const { rows } = await this.pool.query<BatchRow>(
      `SELECT * FROM batches WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? this.toStored(rows[0]) : null;
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedBatches> {
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const offset = (page - 1) * limit;

    const client = await this.pool.connect();
    try {
      const list = await client.query<BatchRow>(
        `SELECT * FROM batches
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM batches WHERE user_id = $1`,
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

  private toStored(row: BatchRow): StoredBatch {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      total: row.total,
      succeeded: row.succeeded,
      failed: row.failed,
      entries: row.entries ?? [],
      createdAt: row.created_at.toISOString(),
    };
  }
}
