/**
 * Authentication Service
 *
 * Real JWT authentication: signs and verifies tokens with a server-side
 * secret (via @nestjs/jwt) and checks passwords against bcrypt hashes.
 *
 * The user store is an in-memory seed for now — replace `users` with a
 * database-backed user repository (and a signup flow) for production.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface TokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
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

interface StoredUser {
  userId: string;
  email: string;
  passwordHash: string;
}

const EXPIRES_IN_SECONDS = 3600; // 1 hour

// A constant valid hash used to equalize timing when the email is unknown,
// reducing a user-enumeration side channel on the login endpoint.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

@Injectable()
export class AuthService {
  private readonly users: StoredUser[];

  constructor(private readonly jwt: JwtService) {
    const salt = bcrypt.genSaltSync(10);
    this.users = [
      {
        userId: 'demo-user-id',
        email: 'demo@example.com',
        passwordHash: bcrypt.hashSync('demo', salt),
      },
      {
        userId: 'admin-user-id',
        email: 'admin@example.com',
        passwordHash: bcrypt.hashSync('admin123', salt),
      },
    ];
  }

  /**
   * Sign a JWT for the given subject.
   */
  async generateToken(payload: { sub: string; email: string }): Promise<TokenResponse> {
    const access_token = await this.jwt.signAsync(
      { sub: payload.sub, email: payload.email },
      { expiresIn: EXPIRES_IN_SECONDS },
    );
    return {
      access_token,
      expires_in: EXPIRES_IN_SECONDS,
      token_type: 'Bearer',
    };
  }

  /**
   * Verify a token's signature and expiry, returning its payload.
   */
  async validateToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwt.verifyAsync<TokenPayload>(token);
    } catch (err) {
      const message = err instanceof TokenExpiredError ? 'Token expired' : 'Invalid token';
      throw new UnauthorizedException(message);
    }
  }

  /**
   * Authenticate credentials against the user store (bcrypt password check).
   */
  async authenticateUser(credentials: UserCredentials): Promise<TokenResponse | null> {
    const user = this.users.find((u) => u.email === credentials.email);
    const password = credentials.password ?? '';

    if (!user) {
      // Compare against a dummy hash so response time does not reveal whether
      // the email exists.
      await bcrypt.compare(password, DUMMY_HASH);
      return null;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return null;
    }

    return this.generateToken({ sub: user.userId, email: user.email });
  }

  /**
   * Verify a token and issue a fresh one for the same subject.
   */
  async refreshToken(token: string): Promise<TokenResponse> {
    const payload = await this.validateToken(token);
    return this.generateToken({ sub: payload.sub, email: payload.email });
  }

  /**
   * Decode a token payload without verifying the signature.
   */
  decodeToken(token: string): Partial<TokenPayload> | null {
    const decoded = this.jwt.decode(token);
    return decoded && typeof decoded === 'object' ? (decoded as TokenPayload) : null;
  }
}
