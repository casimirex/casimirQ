/**
 * Postgres JobsRepository adapter.
 *
 * PostgreSQL-backed implementation. The schema is owned by node-pg-migrate (see
 * migrations/), not created at boot. Bound in JobEngineModule when DATABASE_URL
 * is set. Reuses DATABASE_URL / PGSSL configuration.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type QueryResultRow } from 'pg';
import { Job, JobStatus, JobType, NewJob, createJob } from '../domain/job';
import {
  JobPatch,
  JobsRepository,
  PaginatedJobs,
  PaginationOptions,
} from '../ports/jobs-repository.port';

interface JobRow extends QueryResultRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  progress: string | number;
  payload: unknown;
  result: unknown | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}

@Injectable()
export class PostgresJobsRepository extends JobsRepository implements OnModuleDestroy {
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

  async create(userId: string, input: NewJob): Promise<Job> {
    const job = createJob(userId, input);
    const { rows } = await this.pool.query<JobRow>(
      `INSERT INTO jobs
         (id, user_id, type, status, progress, payload, result, error,
          created_at, updated_at, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        job.id,
        job.userId,
        job.type,
        job.status,
        job.progress,
        JSON.stringify(job.payload),
        null,
        null,
        job.createdAt,
        job.updatedAt,
        null,
        null,
      ],
    );
    return this.toJob(rows[0]);
  }

  async findById(userId: string, id: string): Promise<Job | null> {
    const { rows } = await this.pool.query<JobRow>(
      `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? this.toJob(rows[0]) : null;
  }

  async findForProcessing(id: string): Promise<Job | null> {
    const { rows } = await this.pool.query<JobRow>(`SELECT * FROM jobs WHERE id = $1`, [id]);
    return rows[0] ? this.toJob(rows[0]) : null;
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedJobs> {
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const offset = (page - 1) * limit;

    const client = await this.pool.connect();
    try {
      const list = await client.query<JobRow>(
        `SELECT * FROM jobs
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
      const count = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM jobs WHERE user_id = $1`,
        [userId],
      );
      return {
        items: list.rows.map((r) => this.toJob(r)),
        total: Number(count.rows[0].count),
      };
    } finally {
      client.release();
    }
  }

  async patch(id: string, patch: JobPatch): Promise<Job | null> {
    // Build a dynamic SET clause from only the provided fields.
    const sets: string[] = ['updated_at = $2'];
    const values: unknown[] = [id, new Date().toISOString()];
    const add = (column: string, value: unknown, cast = '') => {
      values.push(value);
      sets.push(`${column} = $${values.length}${cast}`);
    };

    if (patch.status !== undefined) add('status', patch.status);
    if (patch.progress !== undefined) add('progress', patch.progress);
    if (patch.result !== undefined) add('result', JSON.stringify(patch.result), '::jsonb');
    if (patch.error !== undefined) add('error', patch.error);
    if (patch.startedAt !== undefined) add('started_at', patch.startedAt);
    if (patch.finishedAt !== undefined) add('finished_at', patch.finishedAt);

    const { rows } = await this.pool.query<JobRow>(
      `UPDATE jobs SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return rows[0] ? this.toJob(rows[0]) : null;
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM jobs WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  private toJob(row: JobRow): Job {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as JobType,
      status: row.status as JobStatus,
      progress: Number(row.progress),
      payload: row.payload,
      result: row.result,
      error: row.error,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      startedAt: row.started_at ? row.started_at.toISOString() : null,
      finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
    };
  }
}
