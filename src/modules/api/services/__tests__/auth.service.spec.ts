/**
 * Auth Service Tests
 *
 * Tests real JWT signing/verification and bcrypt-backed authentication.
 */

import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { InMemoryUsersRepository } from '../../repositories/in-memory-users.repository';

const SECRET = 'test-secret';

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  let users: InMemoryUsersRepository;

  beforeEach(async () => {
    jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: '1h' } });
    users = new InMemoryUsersRepository();
    service = new AuthService(jwt, users);
    await service.onApplicationBootstrap(); // seed demo/admin users
  });

  describe('generateToken', () => {
    it('generates a 3-part JWT', async () => {
      const token = await service.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      expect(token).toHaveProperty('access_token');
      expect(token.token_type).toBe('Bearer');
      expect(token.access_token.split('.')).toHaveLength(3);
    });

    it('sets a 1-hour expiry', async () => {
      const token = await service.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      expect(token.expires_in).toBe(3600);
    });
  });

  describe('validateToken', () => {
    it('validates a genuine token', async () => {
      const { access_token } = await service.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      const payload = await service.validateToken(access_token);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
    });

    it('rejects a malformed token', async () => {
      await expect(service.validateToken('not-a-jwt')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a tampered signature', async () => {
      const { access_token } = await service.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      const tampered = access_token.slice(0, -6) + 'AAAAAA';
      await expect(service.validateToken(tampered)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token signed with a different secret (forgery)', async () => {
      const forger = new JwtService({ secret: 'attacker-secret' });
      const forged = forger.sign({
        sub: 'admin-user-id',
        email: 'admin@example.com',
      });
      await expect(service.validateToken(forged)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token', async () => {
      const expired = jwt.sign({ sub: 'user-123', email: 'test@example.com' }, { expiresIn: -10 });
      await expect(service.validateToken(expired)).rejects.toThrow('Token expired');
    });
  });

  describe('authenticateUser', () => {
    it('authenticates valid demo credentials', async () => {
      const token = await service.authenticateUser({
        email: 'demo@example.com',
        password: 'demo',
      });
      expect(token).not.toBeNull();
      expect(token).toHaveProperty('access_token');
    });

    it('rejects an unknown email', async () => {
      const token = await service.authenticateUser({
        email: 'nobody@example.com',
        password: 'demo',
      });
      expect(token).toBeNull();
    });

    it('rejects a wrong password', async () => {
      const token = await service.authenticateUser({
        email: 'demo@example.com',
        password: 'wrong',
      });
      expect(token).toBeNull();
    });

    it('normalizes email case/whitespace on login', async () => {
      const token = await service.authenticateUser({
        email: '  DEMO@Example.com ',
        password: 'demo',
      });
      expect(token).not.toBeNull();
    });
  });

  describe('registerUser', () => {
    it('creates a new user and returns a token that authenticates', async () => {
      const { token, user } = await service.registerUser({
        email: 'new@example.com',
        password: 'secret123',
      });
      expect(token).toHaveProperty('access_token');
      expect(user.email).toBe('new@example.com');

      // The new user can now log in.
      const login = await service.authenticateUser({
        email: 'new@example.com',
        password: 'secret123',
      });
      expect(login).not.toBeNull();

      // The token identifies the created user.
      const payload = await service.validateToken(token.access_token);
      expect(payload.sub).toBe(user.id);
    });

    it('rejects a duplicate email', async () => {
      await expect(
        service.registerUser({ email: 'demo@example.com', password: 'secret123' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an invalid email', async () => {
      await expect(
        service.registerUser({ email: 'not-an-email', password: 'secret123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a too-short password', async () => {
      await expect(
        service.registerUser({ email: 'x@example.com', password: '123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not store the password in plaintext', async () => {
      await service.registerUser({ email: 'hash@example.com', password: 'secret123' });
      const stored = await users.findByEmail('hash@example.com');
      expect(stored?.passwordHash).toBeDefined();
      expect(stored?.passwordHash).not.toBe('secret123');
    });
  });

  describe('refreshToken', () => {
    it('issues a valid token from a valid token', async () => {
      const { access_token } = await service.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      const refreshed = await service.refreshToken(access_token);
      const payload = await service.validateToken(refreshed.access_token);
      expect(payload.sub).toBe('user-123');
    });

    it('rejects an invalid token', async () => {
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('decodeToken', () => {
    it('decodes a token payload without verifying', async () => {
      const { access_token } = await service.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      const decoded = service.decodeToken(access_token);
      expect(decoded?.sub).toBe('user-123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('returns null for an invalid token', () => {
      expect(service.decodeToken('invalid')).toBeNull();
    });
  });
});
