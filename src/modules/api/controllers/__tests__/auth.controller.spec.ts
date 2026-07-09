/**
 * Auth Controller Tests
 *
 * Tests for authentication REST API endpoints
 */

import { AuthController } from '../auth.controller';
import { AuthService } from '../../services/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    controller = new AuthController(authService);
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const credentials = { email: 'demo@example.com', password: 'demo' };
      const result = await controller.login(credentials);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', 'demo@example.com');
    });

    it('should throw for invalid credentials', async () => {
      const credentials = { email: 'invalid@example.com', password: 'wrong' };

      await expect(controller.login(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should return new token for valid token', async () => {
      const { access_token } = await authService.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });

      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await controller.refresh({ token: access_token });

      expect(result).toHaveProperty('access_token');
      expect(typeof result.access_token).toBe('string');
      expect(result.access_token.length).toBeGreaterThan(0);
    });

    it('should throw for invalid token', async () => {
      await expect(
        controller.refresh({ token: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should return success message', async () => {
      const req = { user: { email: 'test@example.com' } };
      const result = await controller.logout(req);

      expect(result).toHaveProperty('message', 'Logout successful');
      expect(result).toHaveProperty('user', 'test@example.com');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const req = { user: { userId: 'user-123', email: 'test@example.com' } };
      const result = await controller.getCurrentUser(req);

      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('validateToken', () => {
    it('should return valid status for valid token', async () => {
      const { access_token } = await authService.generateToken({
        sub: 'user-123',
        email: 'test@example.com',
      });

      const result = await controller.validateToken({ token: access_token });

      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('user');
    });

    it('should return invalid status for expired token', async () => {
      const result = await controller.validateToken({
        token: 'invalid-token',
      });

      expect(result).toHaveProperty('valid', false);
      expect(result).toHaveProperty('error');
    });
  });
});
