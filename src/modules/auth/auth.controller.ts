import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Body,
  Res,
  Req,
  Query,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { Roles } from '../../decorators/metadata';
import { CreateAuthDto } from './dto/create-auth.dto';
import { successResponse, errorResponse } from '../../helpers/response';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { sendEmail } from '../../helpers/email';

interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: accessTokenMaxAge,
      });

      res.cookie('refresh_token', result.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return result;
  }

  @Post('refresh')
  async refresh(
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      return errorResponse('Refresh token not found', 401);
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // Get cookie maxAge from environment variables
    const accessTokenMaxAge =
      this.configService.get<number>('ACCESS_TOKEN_COOKIE_MAX_AGE') ||
      15 * 60 * 1000; // Default: 15 minutes
    const refreshTokenMaxAge =
      this.configService.get<number>('REFRESH_TOKEN_COOKIE_MAX_AGE') ||
      7 * 24 * 60 * 60 * 1000; // Default: 7 days

    // Check if result is successful and has data
    if (
      'data' in result &&
      result.data?.access_token &&
      result.data?.refresh_token
    ) {
      res.cookie('access_token', result.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: accessTokenMaxAge,
      });

      res.cookie('refresh_token', result.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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

  @Get('mail')
  async testMail() {
    try {
      await sendEmail(this.mailerService, {
        to: 'ledaian22@gmail.com',
        subject: 'Testing Email Provider ✔',
        template: 'welcome',
        context: {
          username: 'tester',
          email: 'tester@example.com',
          phoneNumber: '0000000000',
          generatePassword: '********',
          role: 'user',
          loginUrl:
            (process.env.CLIENT_URL || 'http://localhost:3000') + '/login',
        },
      });
      return successResponse(null, 'Email sent successfully', 200);
    } catch (error) {
      console.error('Email sending failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return successResponse(
        { error: errorMessage },
        'Failed to send email',
        500,
      );
    }
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      return errorResponse('Token is not provided', 400);
    }
    return this.authService.verifyEmail(token);
  }
}
