/**
 * Authentication Service
 *
 * Real JWT authentication: signs and verifies tokens with a server-side
 * secret (via @nestjs/jwt) and checks passwords against bcrypt hashes stored
 * in the UsersRepository (in-memory or Postgres).
 *
 * On startup the demo/admin accounts are seeded idempotently so the sample
 * credentials keep working; set SEED_DEMO_USERS=false to disable.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { StoredUser, UsersRepository } from '../repositories/users.repository';

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

const EXPIRES_IN_SECONDS = 3600; // 1 hour
const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

// A constant valid hash used to equalize timing when the email is unknown,
// reducing a user-enumeration side channel on the login endpoint.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

const DEMO_USERS = [
  { email: 'demo@example.com', password: 'demo' },
  { email: 'admin@example.com', password: 'admin123' },
];

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  // Runs after every module's onModuleInit (so a DB-backed users table has
  // already been created) — seed the demo accounts idempotently.
  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_DEMO_USERS === 'false') {
      return;
    }
    for (const demo of DEMO_USERS) {
      const email = normalizeEmail(demo.email);
      if (!(await this.users.findByEmail(email))) {
        await this.users.create({
          email,
          passwordHash: await bcrypt.hash(demo.password, BCRYPT_ROUNDS),
        });
      }
    }
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
    const email = normalizeEmail(credentials.email ?? '');
    const password = credentials.password ?? '';
    const user = await this.users.findByEmail(email);

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

    return this.generateToken({ sub: user.id, email: user.email });
  }

  /**
   * Register a new user and return an access token (auto-login).
   */
  async registerUser(
    credentials: UserCredentials,
  ): Promise<{ token: TokenResponse; user: { id: string; email: string } }> {
    const email = normalizeEmail(credentials.email ?? '');
    const password = credentials.password ?? '';

    if (!isValidEmail(email)) {
      throw new BadRequestException('A valid email is required');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.users.create({
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    });
    this.logger.log(`Registered new user ${user.email}`);

    const token = await this.generateToken({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Re-exported for tests that need the stored-user shape.
export type { StoredUser };
