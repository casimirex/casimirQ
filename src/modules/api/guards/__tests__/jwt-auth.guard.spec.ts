/**
 * JWT Auth Guard Tests
 *
 * Tests for JWT authentication guard
 */

import { JwtAuthGuard } from '../jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

// Extend Request type for testing
interface RequestWithUser extends Request {
  user?: { userId: string; email: string };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        } as Request),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow request with valid JWT', () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiJ1c2VyLTEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2NDA5ODc2MDAsImV4cCI6MTY0MDk5MTIwMH0.' +
        'signature';

      const context = createMockContext({
        authorization: `Bearer ${validToken}`,
      });

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw when no authorization header', () => {
      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw when no Bearer token', () => {
      const context = createMockContext({
        authorization: 'Basic credentials',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw when token format is invalid', () => {
      const context = createMockContext({
        authorization: 'Bearer invalid-token',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should attach user to request', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
      };
      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = Buffer.from(JSON.stringify(header))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const encodedPayload = Buffer.from(JSON.stringify(payload))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const token = `${encodedHeader}.${encodedPayload}.signature`;

      const request = {
        headers: { authorization: `Bearer ${token}` },
      } as RequestWithUser;

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(request.user).toBeDefined();
      expect(request.user!.userId).toBe('user-123');
      expect(request.user!.email).toBe('test@example.com');
    });
  });
});
