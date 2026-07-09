/**
 * Authentication Service
 *
 * Handles JWT token generation and validation
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class AuthService {
  private readonly secretKey = 'your-secret-key-change-in-production';
  private readonly expiresIn = 3600; // 1 hour

  /**
   * Generate JWT token for user
   */
  async generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<TokenResponse> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.expiresIn;

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const fullPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.generateSignature(encodedHeader, encodedPayload);

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    return {
      access_token: token,
      expires_in: this.expiresIn,
      token_type: 'Bearer',
    };
  }

  /**
   * Validate and decode JWT token
   */
  async validateToken(token: string): Promise<TokenPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verify signature
    const expectedSignature = this.generateSignature(encodedHeader, encodedPayload);
    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid token signature');
    }

    // Decode payload
    const payload: TokenPayload = JSON.parse(this.base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new UnauthorizedException('Token expired');
    }

    return payload;
  }

  /**
   * Authenticate user credentials
   */
  async authenticateUser(credentials: UserCredentials): Promise<TokenResponse | null> {
    // In a real implementation, verify against database
    // Demo credentials for testing
    const validCredentials = [
      { email: 'demo@example.com', password: 'demo', userId: 'demo-user-id' },
      { email: 'admin@example.com', password: 'admin123', userId: 'admin-user-id' },
    ];

    const matched = validCredentials.find(
      (c) => c.email === credentials.email && c.password === credentials.password,
    );

    if (matched) {
      return this.generateToken({
        sub: matched.userId,
        email: credentials.email,
      });
    }

    return null;
  }

  /**
   * Refresh an existing token
   */
  async refreshToken(token: string): Promise<TokenResponse> {
    const payload = await this.validateToken(token);
    return this.generateToken({
      sub: payload.sub,
      email: payload.email,
    });
  }

  /**
   * Extract payload from token without validation
   */
  decodeToken(token: string): Partial<TokenPayload> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(this.base64UrlDecode(parts[1]));
    } catch {
      return null;
    }
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(str: string): string {
    // Add padding
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return Buffer.from(base64, 'base64').toString();
  }

  private generateSignature(header: string, payload: string): string {
    const crypto = require('crypto');
    const data = `${header}.${payload}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return signature;
  }
}
