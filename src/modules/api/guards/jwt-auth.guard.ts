/**
 * JWT Authentication Guard
 *
 * Protects routes by verifying the JWT signature and expiry (not just its
 * shape) via AuthService, then attaching the authenticated user to the request.
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';

// Extend Express Request type
interface RequestWithUser extends Request {
  user?: { userId: string; email: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Throws UnauthorizedException if the signature is invalid or expired.
    const payload = await this.authService.validateToken(token);

    request.user = { userId: payload.sub, email: payload.email };
    return true;
  }

  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
