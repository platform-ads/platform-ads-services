import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from '../../../decorators/metadata';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiểm tra xem có decorator @Roles() không
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có @Roles() => public, không cần xác thực
    if (!requiredRoles) {
      return true;
    }

    // Nếu có @Roles() => yêu cầu xác thực JWT
    return super.canActivate(context);
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
