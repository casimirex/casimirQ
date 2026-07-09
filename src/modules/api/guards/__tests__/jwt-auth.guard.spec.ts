/**
 * JWT Auth Guard Tests
 *
 * Verifies the guard actually validates token signatures (not just format).
 */

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { AuthService } from '../../services/auth.service';

const SECRET = 'test-secret';

function contextWith(headers: Record<string, string>, sink?: { user?: unknown }) {
  const request: any = { headers, ...(sink ?? {}) };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    __request: request,
  } as unknown as ExecutionContext & { __request: any };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: JwtService;

  beforeEach(() => {
    jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: '1h' } });
    guard = new JwtAuthGuard(new AuthService(jwt));
  });

  it('allows a request with a genuine token', async () => {
    const token = jwt.sign({ sub: 'user-1', email: 'test@example.com' });
    const ctx = contextWith({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('attaches the authenticated user to the request', async () => {
    const token = jwt.sign({ sub: 'user-123', email: 'test@example.com' });
    const ctx = contextWith({ authorization: `Bearer ${token}` }) as any;
    await guard.canActivate(ctx);
    expect(ctx.__request.user).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
    });
  });

  it('throws when there is no authorization header', async () => {
    await expect(guard.canActivate(contextWith({}))).rejects.toThrow(UnauthorizedException);
  });

  it('throws when the scheme is not Bearer', async () => {
    await expect(guard.canActivate(contextWith({ authorization: 'Basic creds' }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a structurally-valid but unsigned token (the old bypass)', async () => {
    // header.payload.signature with a bogus signature — previously accepted.
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'admin-user-id', email: 'admin@example.com' }),
    ).toString('base64url');
    const forged = `${header}.${payload}.not-a-real-signature`;
    await expect(
      guard.canActivate(contextWith({ authorization: `Bearer ${forged}` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = new JwtService({ secret: 'attacker' }).sign({
      sub: 'admin-user-id',
      email: 'admin@example.com',
    });
    await expect(
      guard.canActivate(contextWith({ authorization: `Bearer ${forged}` })),
    ).rejects.toThrow(UnauthorizedException);
  });
});
