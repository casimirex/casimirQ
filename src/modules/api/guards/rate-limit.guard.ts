/**
 * Rate Limiting Guard
 *
 * Implements API rate limiting per user
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

// Extend Express Request type
interface RequestWithUser extends Request {
  user?: { userId: string; email: string };
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // In-memory store for rate limiting (use Redis in production)
  private readonly rateLimits = new Map<string, RateLimitEntry>();

  // Default limits
  private readonly maxRequests = 100;
  private readonly windowMs = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const key = this.getRateLimitKey(request);
    const now = Date.now();

    const entry = this.rateLimits.get(key);

    if (!entry || now > entry.resetTime) {
      // Initialize or reset window
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      throw new ForbiddenException(
        `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds`,
      );
    }

    entry.count++;
    this.rateLimits.set(key, entry);

    return true;
  }

  private getRateLimitKey(request: RequestWithUser): string {
    const userId = request['user']?.userId || 'anonymous';
    const path = request.route?.path || request.path;
    return `${userId}:${path}`;
  }

  /**
   * Get current rate limit status for a key
   */
  getRateLimitStatus(key: string): { remaining: number; resetTime: number } | null {
    const entry = this.rateLimits.get(key);
    if (!entry) {
      return null;
    }
    return {
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clear rate limit for a key (useful for testing)
   */
  clearRateLimit(key: string): void {
    this.rateLimits.delete(key);
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  clearAllRateLimits(): void {
    this.rateLimits.clear();
  }
}
