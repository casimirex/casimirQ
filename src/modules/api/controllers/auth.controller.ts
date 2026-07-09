/**
 * Authentication API Controller
 *
 * REST endpoints for user authentication
 */

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService, UserCredentials } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login and get JWT token
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() credentials: UserCredentials,
  ) {
    const token = await this.authService.authenticateUser(credentials);

    if (!token) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      ...token,
      user: {
        email: credentials.email,
      },
    };
  }

  /**
   * Refresh JWT token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { token: string },
  ) {
    try {
      const newToken = await this.authService.refreshToken(body.token);
      return newToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Logout (invalidate token on client side)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    return {
      message: 'Logout successful',
      user: req.user?.email,
    };
  }

  /**
   * Get current user info
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: any) {
    return {
      user: req.user,
    };
  }

  /**
   * Validate token
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(
    @Body() body: { token: string },
  ) {
    try {
      const payload = await this.authService.validateToken(body.token);
      return {
        valid: true,
        user: {
          sub: payload.sub,
          email: payload.email,
        },
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
