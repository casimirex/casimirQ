/**
 * MetricsInterceptor — times every HTTP request and records it into the
 * MetricsService when the response finishes, then logs a structured line for
 * request tracing (method, route, status, duration, request id).
 *
 * Recording on the response `finish` event (rather than in the RxJS pipe)
 * captures the true final status code, even for requests that end in an
 * exception filter.
 */

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();
    const start = process.hrtime.bigint();

    res.once('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      // Use the matched route pattern (e.g. /api/v1/circuits/:id), not the raw
      // URL, to keep label cardinality bounded.
      const route = req.route?.path ?? req.path ?? 'unknown';
      const status = res.statusCode;

      this.metrics.recordHttpRequest(req.method, route, status, durationSeconds);

      // Skip the scrape endpoint to keep logs readable.
      if (route !== '/metrics') {
        const ms = (durationSeconds * 1000).toFixed(1);
        this.logger.log(`${req.method} ${route} ${status} ${ms}ms req=${req.requestId ?? '-'}`);
      }
    });

    return next.handle();
  }
}
