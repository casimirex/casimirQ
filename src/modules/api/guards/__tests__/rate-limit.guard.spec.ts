/**
 * Rate Limit Guard Tests
 *
 * Tests for API rate limiting guard
 */

import { RateLimitGuard } from '../rate-limit.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

// Extend Request type for testing
interface RequestWithUser extends Request {
  user?: { userId: string; email?: string };
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(() => {
    guard = new RateLimitGuard();
    guard.clearAllRateLimits();
  });

  const createMockContext = (
    userId: string = 'user-1',
    path: string = '/api/test',
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId },
          route: { path },
          path,
        } as RequestWithUser),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow request within rate limit', () => {
      const context = createMockContext();
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should track multiple requests', () => {
      const context = createMockContext();

      // First 100 requests should succeed
      for (let i = 0; i < 99; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });

    it('should block requests exceeding rate limit', () => {
      const context = createMockContext();

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        guard.canActivate(context);
      }

      // 101st request should throw
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle anonymous users', () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            route: { path: '/api/test' },
            path: '/api/test',
          }),
        }),
      } as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should have separate limits per user and path', () => {
      const context1 = createMockContext('user-1', '/api/endpoint1');
      const context2 = createMockContext('user-1', '/api/endpoint2');
      const context3 = createMockContext('user-2', '/api/endpoint1');

      // All should succeed initially
      expect(guard.canActivate(context1)).toBe(true);
      expect(guard.canActivate(context2)).toBe(true);
      expect(guard.canActivate(context3)).toBe(true);

      // Verify separate tracking
      const status1 = guard.getRateLimitStatus('user-1:/api/endpoint1');
      const status2 = guard.getRateLimitStatus('user-1:/api/endpoint2');
      const status3 = guard.getRateLimitStatus('user-2:/api/endpoint1');

      expect(status1?.remaining).toBe(99);
      expect(status2?.remaining).toBe(99);
      expect(status3?.remaining).toBe(99);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return null for non-existent key', () => {
      const status = guard.getRateLimitStatus('unknown-key');
      expect(status).toBeNull();
    });

    it('should return remaining requests and reset time', () => {
      const context = createMockContext();
      guard.canActivate(context);

      const status = guard.getRateLimitStatus('user-1:/api/test');
      expect(status).not.toBeNull();
      expect(status?.remaining).toBe(99);
      expect(status?.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for specific key', () => {
      const context = createMockContext();

      // Reach rate limit
      for (let i = 0; i < 100; i++) {
        guard.canActivate(context);
      }

      // Should throw
      expect(() => guard.canActivate(context)).toThrow();

      // Clear rate limit
      guard.clearRateLimit('user-1:/api/test');

      // Should succeed again
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const context1 = createMockContext('user-1', '/api/test1');
      const context2 = createMockContext('user-2', '/api/test2');

      // Make requests
      guard.canActivate(context1);
      guard.canActivate(context2);

      // Clear all
      guard.clearAllRateLimits();

      // Should return null for both
      expect(guard.getRateLimitStatus('user-1:/api/test1')).toBeNull();
      expect(guard.getRateLimitStatus('user-2:/api/test2')).toBeNull();
    });
  });
});
