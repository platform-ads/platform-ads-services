import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { Roles } from '../../decorators/metadata';
import { CreateAuthDto } from './dto/create-auth.dto';
import { ConfigService } from '@nestjs/config';

interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signin')
  @UseGuards(LocalAuthGuard)
  async signIn(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signIn(req.user);

    // Get cookie maxAge from environment variables
    const accessTokenMaxAge =
      this.configService.get<number>('ACCESS_TOKEN_COOKIE_MAX_AGE') ||
      15 * 60 * 1000; // Default: 15 minutes
    const refreshTokenMaxAge =
      this.configService.get<number>('REFRESH_TOKEN_COOKIE_MAX_AGE') ||
      7 * 24 * 60 * 60 * 1000; // Default: 7 days

    // Set both access token and refresh token in HTTP-only cookies
    if (result.data?.access_token && result.data?.refresh_token) {
      res.cookie('access_token', result.data.access_token, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: accessTokenMaxAge,
      });

      res.cookie('refresh_token', result.data.refresh_token, {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'lax',
        maxAge: refreshTokenMaxAge,
      });

      // Remove tokens from response body for security
      const {
        access_token: _at,
        refresh_token: _rt,
        ...restData
      } = result.data;
      return { ...result, data: restData };
    }

    return result;
  }

  @Post('signup')
  signUp(@Body() registerDto: CreateAuthDto) {
    return this.authService.signUp(registerDto);
  }

  @Post('logout')
  @Roles('admin', 'user')
  async logOut(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logOut(req.user);

    // Clear both access token and refresh token cookies
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
    });

    return result;
  }
}
