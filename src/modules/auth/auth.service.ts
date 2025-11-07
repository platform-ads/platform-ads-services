import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '../../helpers/util';
import { errorResponse, successResponse } from '../../helpers/response';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {}

  private parseExpirationToSeconds(expiration: string): number {
    const timeValue = parseInt(expiration);
    const timeUnit = expiration.slice(-1);

    const multipliers: { [key: string]: number } = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return timeValue * (multipliers[timeUnit] || 1);
  }

  async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email: email,
    };

    const jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret';
    const jwtRefreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtRefreshSecret,
      expiresIn: this.parseExpirationToSeconds(jwtRefreshExpiresIn),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.updateOne(
      { _id: userId },
      { refreshToken: hashedRefreshToken },
    );
  }

  async signIn(user: UserDocument) {
    await this.userModel.updateOne(
      { _id: user._id },
      { lastLoginAt: new Date() },
    );

    const tokens = await this.generateTokens(user._id.toString(), user.email);

    await this.updateRefreshToken(user._id.toString(), tokens.refresh_token);

    return successResponse(tokens, 'Sign in successful', 200);
  }

  async signUp(registerDto: CreateAuthDto) {
    const { email, phoneNumber, password, role, keySecret } = registerDto;

    // Check if email already exists
    const existingUserByEmail = await this.userModel.findOne({ email });
    if (existingUserByEmail) {
      return errorResponse(
        'This email is already registered. Please use a different email or login to your existing account.',
        400,
      );
    }

    // Check if phone number already exists
    const existingUserByPhone = await this.userModel.findOne({ phoneNumber });
    if (existingUserByPhone) {
      return errorResponse(
        'This phone number is already registered. Please use a different phone number or login to your existing account.',
        400,
      );
    }

    const username = email.split('@')[0];
    const hashPassword = await hashPasswordHelper(password);

    const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=random&size=128`;
    const avatarLink = '';
    const points = role === 'admin' ? 999999999 : 0;

    if (role === 'admin') {
      if (
        keySecret !== this.configService.get<string>('ADMIN_REGISTRATION_KEY')
      ) {
        return errorResponse('Invalid key secret for admin registration', 403);
      }
    }

    const user = await this.userModel.create({
      isActive: true, // All users are active by default
      role: role || 'user',
      username,
      email,
      password: hashPassword,
      phoneNumber,
      avatarUrl,
      avatarLink,
      points,
    });

    const response = {
      userId: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      avatarLink: user.avatarLink,
      points: user.points,
      isActive: user.isActive,
      message:
        role === 'admin'
          ? 'Admin account has been created and activated successfully.'
          : 'Registration successful! You can now login.',
    };

    return successResponse(response, 'User registered successfully', 201);
  }

  async validateUser(loginDto: LoginAuthDto): Promise<User | null> {
    const { emailOrUsername, password } = loginDto;

    const user = await this.usersService.findByEmailOrUsername(emailOrUsername);

    if (!user || !password) {
      return null;
    }

    return user;
  }

  async logOut(user: UserDocument) {
    const existingUser = await this.usersService.findById(user._id.toString());

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    await this.userModel.updateOne(
      { _id: user._id },
      { lastLogoutAt: new Date(), refreshToken: null },
    );

    return successResponse(null, 'Logout successful', 200);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const jwtRefreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'refresh-secret';

      interface JwtPayload {
        sub: string;
        email: string;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: jwtRefreshSecret,
        },
      );

      const user = await this.usersService.findByEmail(payload.email);

      if (!user || !user.refreshToken) {
        return errorResponse('Invalid refresh token', 401);
      }

      const refreshTokenMatches = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!refreshTokenMatches) {
        return errorResponse('Invalid refresh token', 401);
      }

      const tokens = await this.generateTokens(user._id.toString(), user.email);

      await this.updateRefreshToken(user._id.toString(), tokens.refresh_token);

      return successResponse(tokens, 'Tokens refreshed successfully', 200);
    } catch {
      return errorResponse('Invalid or expired refresh token', 401);
    }
  }

  verifyEmail(_token: string) {
    // Email verification is no longer used
    return errorResponse('Email verification is not available', 400);
  }
}
