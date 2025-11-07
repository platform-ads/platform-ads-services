import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from '../../../decorators/metadata';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Kiểm tra xem có decorator @Roles() không
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có @Roles() => public, không cần xác thực
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const accessToken = request.cookies?.access_token as string | undefined;
    const refreshToken = request.cookies?.refresh_token as string | undefined;

    // Nếu có access token, thử validate
    if (accessToken) {
      try {
        // Gọi super để validate access token
        const result = await super.canActivate(context);
        return result as boolean;
      } catch (error: unknown) {
        // Nếu access token hết hạn và có refresh token
        const err = error as { name?: string; message?: string };
        if (
          (err.message && err.message.includes('expired')) ||
          err.name === 'TokenExpiredError'
        ) {
          if (refreshToken) {
            try {
              // Tự động refresh token
              const result = await this.authService.refreshTokens(refreshToken);

              if ('data' in result && result.data) {
                const { access_token, refresh_token } = result.data;

                // Get cookie maxAge from environment variables
                const accessTokenMaxAge =
                  this.configService.get<number>(
                    'ACCESS_TOKEN_COOKIE_MAX_AGE',
                  ) || 15 * 60 * 1000;
                const refreshTokenMaxAge =
                  this.configService.get<number>(
                    'REFRESH_TOKEN_COOKIE_MAX_AGE',
                  ) || 7 * 24 * 60 * 60 * 1000;

                // Set new tokens in cookies
                response.cookie('access_token', access_token, {
                  httpOnly: true,
                  secure:
                    this.configService.get<string>('NODE_ENV') === 'production',
                  sameSite: 'lax',
                  maxAge: accessTokenMaxAge,
                });

                response.cookie('refresh_token', refresh_token, {
                  httpOnly: true,
                  secure:
                    this.configService.get<string>('NODE_ENV') === 'production',
                  sameSite: 'lax',
                  maxAge: refreshTokenMaxAge,
                });

                // Update request with new access token
                if (request.cookies) {
                  request.cookies.access_token = access_token;
                }

                // Validate again with new token
                const validateResult = await super.canActivate(context);
                return validateResult as boolean;
              }
            } catch {
              throw new UnauthorizedException(
                'Session expired. Please login again.',
              );
            }
          }
        }
        throw error;
      }
    }

    // Nếu không có access token
    throw new UnauthorizedException(
      'Authentication credentials not found. Please login.',
    );
  }

  handleRequest(err: any, user: any, info: any): any {
    // Xử lý các lỗi JWT cụ thể
    if (info && typeof info === 'object' && 'name' in info) {
      const errorName = (info as { name: string }).name;
      if (errorName === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Access token has expired. Please login again.',
        );
      }
      if (errorName === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token.');
      }
      if (errorName === 'NotBeforeError') {
        throw new UnauthorizedException('Access token is not yet valid.');
      }
    }

    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException(
        'Authentication credentials not found. Please login.',
      );
    }

    return user;
  }
}
