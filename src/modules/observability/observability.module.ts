/**
 * ObservabilityModule — health probes, Prometheus metrics, and request tracing.
 *
 * Wires three concerns:
 *   - Health/readiness endpoints (HealthController + HealthService).
 *   - A `/metrics` scrape endpoint backed by MetricsService.
 *   - A global MetricsInterceptor (HTTP counts + latency + structured logs) and
 *     a RequestIdMiddleware (trace correlation) applied to every route.
 */

import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { RequestIdMiddleware } from './request-id.middleware';

@Global()
@Module({
  controllers: [HealthController, MetricsController],
  providers: [
    HealthService,
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [MetricsService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
