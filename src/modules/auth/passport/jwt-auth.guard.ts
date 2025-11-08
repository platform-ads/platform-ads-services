import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from '../../../decorators/metadata';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';

interface RequestWithUser extends Request {
  user?: any;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();
    const accessToken = request.cookies?.access_token as string | undefined;
    const refreshToken = request.cookies?.refresh_token as string | undefined;

    // Nếu KHÔNG có access token NHƯNG có refresh token → thử refresh ngay
    if (!accessToken && refreshToken) {
      try {
        const result = await this.authService.refreshTokens(refreshToken);

        if ('data' in result && result.data) {
          const { access_token, refresh_token } = result.data;

          const accessTokenMaxAge =
            this.configService.get<number>('ACCESS_TOKEN_COOKIE_MAX_AGE') ||
            15 * 60 * 1000;
          const refreshTokenMaxAge =
            this.configService.get<number>('REFRESH_TOKEN_COOKIE_MAX_AGE') ||
            7 * 24 * 60 * 60 * 1000;

          response.cookie('access_token', access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: accessTokenMaxAge,
            path: '/',
          });

          response.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: refreshTokenMaxAge,
            path: '/',
          });

          // Verify new access token và load user
          const jwtSecret =
            this.configService.get<string>('JWT_SECRET') || 'default-secret';
          const payload = await this.jwtService.verifyAsync<{
            sub: string;
            email: string;
          }>(access_token, {
            secret: jwtSecret,
          });

          const user = await this.usersService.findByEmail(payload.email);
          if (!user) {
            throw new UnauthorizedException('User not found');
          }

          const {
            password: _pwd,
            refreshToken: _rt,
            ...userWithoutSensitive
          } = user.toObject();
          request.user = userWithoutSensitive;

          return true;
        }

        throw new UnauthorizedException('Failed to refresh token');
      } catch {
        throw new UnauthorizedException('Session expired. Please login again.');
      }
    }

    // Nếu có access token, thử validate
    if (accessToken) {
      try {
        // Verify access token
        const jwtSecret =
          this.configService.get<string>('JWT_SECRET') || 'default-secret';
        const payload = await this.jwtService.verifyAsync<{
          sub: string;
          email: string;
        }>(accessToken, {
          secret: jwtSecret,
        });

        // Load user và attach vào request
        const user = await this.usersService.findByEmail(payload.email);
        if (!user) {
          throw new UnauthorizedException('User not found');
        }

        const {
          password: _pwd,
          refreshToken: _rt,
          ...userWithoutSensitive
        } = user.toObject();
        request.user = userWithoutSensitive;

        return true;
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
                  secure: true,
                  sameSite: 'none',
                  maxAge: accessTokenMaxAge,
                  path: '/',
                });

                response.cookie('refresh_token', refresh_token, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'none',
                  maxAge: refreshTokenMaxAge,
                  path: '/',
                });

                // Verify new access token và load user
                const jwtSecret =
                  this.configService.get<string>('JWT_SECRET') ||
                  'default-secret';
                const payload = await this.jwtService.verifyAsync<{
                  sub: string;
                  email: string;
                }>(access_token, {
                  secret: jwtSecret,
                });

                const user = await this.usersService.findByEmail(payload.email);
                if (!user) {
                  throw new UnauthorizedException('User not found');
                }

                const {
                  password: _pwd,
                  refreshToken: _rt,
                  ...userWithoutSensitive
                } = user.toObject();
                request.user = userWithoutSensitive;

                return true;
              }

              throw new UnauthorizedException('Failed to refresh token');
            } catch {
              throw new UnauthorizedException(
                'Session expired. Please login again.',
              );
            }
          }

          throw new UnauthorizedException(
            'Access token expired and no refresh token available.',
          );
        }

        // Other JWT errors
        throw new UnauthorizedException('Invalid access token');
      }
    }

    // Nếu không có access token
    throw new UnauthorizedException(
      'Authentication credentials not found. Please login.',
    );
  }

  handleRequest(err: any, user: any): any {
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
