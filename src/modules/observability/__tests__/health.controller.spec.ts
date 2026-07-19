/**
 * HealthController tests — liveness shape and the readiness decision, including
 * the 503-when-a-dependency-is-down branch (which is awkward to trigger live).
 */

import { HealthController } from '../health.controller';
import { DependencyCheck, HealthService } from '../health.service';

function fakeHealth(database: DependencyCheck): HealthService {
  return { checkDatabase: async () => database } as unknown as HealthService;
}

/** Minimal Express-Response stub capturing the status code. */
function fakeRes() {
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
  };
}

describe('HealthController', () => {
  it('liveness reports ok with uptime and version', () => {
    const controller = new HealthController(fakeHealth({ status: 'skipped' }));
    const body = controller.liveness();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime).toBe('number');
    expect(body.version).toBeDefined();
  });

  it('readiness is 200 when the database is up', async () => {
    const controller = new HealthController(fakeHealth({ status: 'up' }));
    const res = fakeRes();
    const body = await controller.readiness(res as never);
    expect(body.status).toBe('ready');
    expect(body.checks.database.status).toBe('up');
    expect(res.statusCode).toBe(200);
  });

  it('readiness is 200 when the database is skipped (in-memory mode)', async () => {
    const controller = new HealthController(fakeHealth({ status: 'skipped' }));
    const res = fakeRes();
    const body = await controller.readiness(res as never);
    expect(body.status).toBe('ready');
    expect(res.statusCode).toBe(200);
  });

  it('readiness is 503 when the database is down', async () => {
    const controller = new HealthController(fakeHealth({ status: 'down', error: 'ECONNREFUSED' }));
    const res = fakeRes();
    const body = await controller.readiness(res as never);
    expect(body.status).toBe('not_ready');
    expect(res.statusCode).toBe(503);
  });
});
