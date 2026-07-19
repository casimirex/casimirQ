/**
 * Health probes — liveness and readiness.
 *
 * `GET /api/v1/health` is a pure liveness check: it returns 200 whenever the
 * process is up, for restart/liveness orchestration. `GET /api/v1/ready` is a
 * readiness check: it verifies dependencies (the database) and returns 503 when
 * the service should not receive traffic. Both are unauthenticated.
 */

import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';

function readVersion(): string {
  try {
    return require('../../../package.json').version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

@ApiTags('Health')
@Controller('api/v1')
export class HealthController {
  private readonly version = readVersion();

  constructor(private readonly health: HealthService) {}

  /** Liveness: the process is running. */
  @Get('health')
  liveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: dependencies are reachable (503 otherwise). */
  @Get('ready')
  async readiness(@Res({ passthrough: true }) res: Response) {
    const database = await this.health.checkDatabase();
    const ready = database.status !== 'down';
    if (!ready) res.status(503);
    return {
      status: ready ? 'ready' : 'not_ready',
      checks: { database },
      timestamp: new Date().toISOString(),
    };
  }
}
