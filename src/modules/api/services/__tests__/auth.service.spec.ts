/**
 * Auth Service Tests
 *
 * Tests for JWT authentication service
 */

import { AuthService } from '../auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await service.generateToken(payload);

      expect(token).toHaveProperty('access_token');
      expect(token).toHaveProperty('expires_in');
      expect(token).toHaveProperty('token_type', 'Bearer');

      // Verify token format (header.payload.signature)
      const parts = token.access_token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should include correct expiration time', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = await service.generateToken(payload);

      expect(token.expires_in).toBe(3600); // 1 hour
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const { access_token } = await service.generateToken(payload);

      const validated = await service.validateToken(access_token);

      expect(validated.sub).toBe('user-123');
      expect(validated.email).toBe('test@example.com');
    });

    it('should throw on invalid token format', async () => {
      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on invalid signature', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const { access_token } = await service.generateToken(payload);
      const modifiedToken = access_token.slice(0, -10) + 'invalid';

      await expect(service.validateToken(modifiedToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on expired token', async () => {
      // Create an expired token manually
      const expiredPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: 0,
        exp: 1, // Expired in 1970
      };

      const header = { alg: 'HS256', typ: 'JWT' };
      const encodedHeader = Buffer.from(JSON.stringify(header))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const encodedPayload = Buffer.from(JSON.stringify(expiredPayload))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Generate a valid signature for this payload
      const crypto = require('crypto');
      const data = `${encodedHeader}.${encodedPayload}`;
      const signature = crypto
        .createHmac('sha256', 'your-secret-key-change-in-production')
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const expiredToken = `${encodedHeader}.${encodedPayload}.${signature}`;

      await expect(service.validateToken(expiredToken)).rejects.toThrow(
        'Token expired',
      );
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate valid demo credentials', async () => {
      const credentials = { email: 'demo@example.com', password: 'demo' };
      const token = await service.authenticateUser(credentials);

      expect(token).not.toBeNull();
      expect(token).toHaveProperty('access_token');
    });

    it('should reject invalid credentials', async () => {
      const credentials = { email: 'invalid@example.com', password: 'wrong' };
      const token = await service.authenticateUser(credentials);

      expect(token).toBeNull();
    });

    it('should reject wrong password', async () => {
      const credentials = { email: 'demo@example.com', password: 'wrong' };
      const token = await service.authenticateUser(credentials);

      expect(token).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should generate new token from valid token', async () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const { access_token } = await service.generateToken(payload);

      const newToken = await service.refreshToken(access_token);

      expect(newToken).toHaveProperty('access_token');
      expect(newToken).not.toBe(access_token); // Different token
    });

    it('should throw on invalid token', async () => {
      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode token payload without validation', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      service.generateToken(payload).then(({ access_token }) => {
        const decoded = service.decodeToken(access_token);

        expect(decoded).not.toBeNull();
        expect(decoded!.sub).toBe('user-123');
        expect(decoded!.email).toBe('test@example.com');
      });
    });

    it('should return null for invalid token', () => {
      const decoded = service.decodeToken('invalid');
      expect(decoded).toBeNull();
    });
  });
});
