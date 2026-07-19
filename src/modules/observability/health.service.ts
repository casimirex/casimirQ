/**
 * HealthService — dependency checks for the readiness probe.
 *
 * The one external dependency is Postgres (used when `DATABASE_URL` is set; the
 * platform otherwise runs fully in-memory). The check runs `SELECT 1` on a
 * dedicated single-connection pool so readiness reflects real database
 * reachability without disturbing the application pools.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

export type CheckStatus = 'up' | 'down' | 'skipped';

export interface DependencyCheck {
  status: CheckStatus;
  error?: string;
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly pool?: Pool;

  constructor() {
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
        max: 1,
        connectionTimeoutMillis: 3000,
      });
    }
  }

  /** Ping the database, or report `skipped` when running in-memory. */
  async checkDatabase(): Promise<DependencyCheck> {
    if (!this.pool) return { status: 'skipped' };
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
      return { status: 'up' };
    } catch (err) {
      return { status: 'down', error: err instanceof Error ? err.message : String(err) };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
