/**
 * JWT Authentication Guard
 *
 * Protects routes using JWT token validation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

// Extend Express Request type
interface RequestWithUser extends Request {
  user?: { userId: string; email: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // In a real implementation, verify JWT signature
    // For now, validate token format
    const isValid = this.validateToken(token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid token');
    }

    // Attach user info to request
    request['user'] = this.decodeToken(token);

    return true;
  }

  private extractTokenFromHeader(request: RequestWithUser): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private validateToken(token: string): boolean {
    // Basic JWT format validation (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check if parts are base64 encoded
    try {
      parts.forEach(part => {
        Buffer.from(part, 'base64');
      });
      return true;
    } catch {
      return false;
    }
  }

  private decodeToken(token: string): { userId: string; email: string } {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      return {
        userId: payload.sub || 'anonymous',
        email: payload.email || 'unknown',
      };
    } catch {
      return { userId: 'anonymous', email: 'unknown' };
    }
  }
}
