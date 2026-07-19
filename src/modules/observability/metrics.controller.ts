/**
 * Metrics endpoint — `GET /metrics` in Prometheus text exposition format.
 *
 * Served at the root (not under `/api/v1`) and unauthenticated, matching the
 * convention Prometheus scrapers expect.
 */

import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  scrape(): string {
    return this.metrics.render();
  }
}
