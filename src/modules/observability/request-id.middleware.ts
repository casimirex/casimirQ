/**
 * RequestIdMiddleware — attaches a request id to every request for tracing.
 *
 * Honors an inbound `X-Request-Id` (so a trace can span services) or mints a
 * new UUID, stashes it on `req.requestId`, and echoes it back in the response
 * header so clients and logs can correlate a call end to end.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
    const header = req.headers['x-request-id'];
    const id = (Array.isArray(header) ? header[0] : header) || randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
