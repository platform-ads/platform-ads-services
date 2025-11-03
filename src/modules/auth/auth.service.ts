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
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { sendEmailAsync } from 'src/helpers/email';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    private mailerService: MailerService,
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
    const { email, phoneNumber, role, keySecret } = registerDto;

    // Check if email already exists
    const existingUserByEmail = await this.userModel.findOne({ email });
    if (existingUserByEmail) {
      // If account exists but not verified
      if (
        !existingUserByEmail.isActive &&
        existingUserByEmail.verificationToken
      ) {
        // Check if user is trying to register again within 120 seconds
        const twoMinutesAgo = new Date(Date.now() - 120 * 1000);

        if (
          existingUserByEmail.lastVerificationEmailSent &&
          existingUserByEmail.lastVerificationEmailSent > twoMinutesAgo
        ) {
          const timeLeftSeconds = Math.ceil(
            (existingUserByEmail.lastVerificationEmailSent.getTime() +
              120 * 1000 -
              Date.now()) /
              1000,
          );
          return errorResponse(
            `Please wait ${timeLeftSeconds} seconds before requesting another verification email. Check your inbox (including spam folder) for the previous verification email.`,
            429,
          );
        }

        // If 120 seconds have passed, allow resending verification email
        await this.userModel.updateOne(
          { _id: existingUserByEmail._id },
          {
            lastVerificationEmailSent: new Date(),
          },
        );

        // Resend verification email with existing data
        const clientUrl =
          this.configService.get<string>('CLIENT_URL') ||
          'http://localhost:3000';
        const verificationUrl = `${clientUrl}/auth/verify-email?token=${existingUserByEmail.verificationToken}`;

        sendEmailAsync(this.mailerService, {
          to: email,
          subject: 'Verify Your Platform Ads Account ',
          template: 'verify-email',
          context: {
            username: existingUserByEmail.username,
            email: existingUserByEmail.email,
            role: existingUserByEmail.role || 'user',
            verificationUrl,
            expirationTime: '1 hour',
            generatePassword: existingUserByEmail.plainPassword || '********',
          },
        });

        return successResponse(
          {
            email: existingUserByEmail.email,
            message:
              'A verification email has been resent. Please check your inbox.',
          },
          'Verification email resent successfully',
          200,
        );
      } else {
        // Account already exists and is active
        return errorResponse(
          'This email is already registered. Please use a different email or login to your existing account.',
          400,
        );
      }
    }

    // Check if phone number already exists
    const existingUserByPhone = await this.userModel.findOne({ phoneNumber });
    if (existingUserByPhone) {
      // If account exists but not verified, delete it and allow re-registration
      if (
        !existingUserByPhone.isActive &&
        existingUserByPhone.verificationToken
      ) {
        // If this is a different user (different email), just delete the old phone record
        if (existingUserByPhone.email !== email) {
          await this.userModel.deleteOne({ _id: existingUserByPhone._id });
        }
        // If same user, already handled above in email check
      } else {
        // Account already exists and is active
        return errorResponse(
          'This phone number is already registered. Please use a different phone number or login to your existing account.',
          400,
        );
      }
    }

    const username = email.split('@')[0];

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    const generateRandomPassword = () => {
      const length = 12;
      const chars =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
      let newPassword = '';
      do {
        newPassword = Array.from(
          { length },
          () => chars[Math.floor(Math.random() * chars.length)],
        ).join('');
      } while (!passwordRegex.test(newPassword));
      return newPassword;
    };

    const generatePassword = generateRandomPassword();

    const hashPassword = await hashPasswordHelper(generatePassword);

    const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=random&size=128`;
    const avatarLink = '';
    const points = role === 'admin' ? 999999999 : 0;
    const isActiveUser = role === 'admin' ? true : false;

    if (role === 'admin') {
      if (keySecret !== process.env.ADMIN_KEY_SECRET) {
        return errorResponse('Invalid key secret for admin registration', 403);
      }
    }

    // Generate verification token for regular users (not admin)
    let verificationToken: string | null = null;
    let verificationExpiration: Date | null = null;

    if (role !== 'admin') {
      verificationToken = crypto.randomBytes(32).toString('hex');
      // Token expires after 1 hour
      verificationExpiration = new Date(Date.now() + 60 * 60 * 1000);
    }

    const user = await this.userModel.create({
      isActive: isActiveUser,
      role: role || 'user',
      username,
      email,
      password: hashPassword,
      phoneNumber,
      avatarUrl,
      avatarLink,
      points,
      verificationToken,
      verificationExpiration,
      plainPassword: generatePassword,
      lastVerificationEmailSent: role === 'admin' ? null : new Date(),
    });

    const clientUrl =
      this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';

    // Send welcome email for admin
    if (role === 'admin') {
      // send welcome email to admin and clear plain password afterwards
      sendEmailAsync(this.mailerService, {
        to: email,
        subject: 'Welcome Admin to Platform Ads! 🎉',
        template: 'welcome',
        context: {
          username,
          email,
          phoneNumber,
          generatePassword,
          role: role || 'user',
          loginUrl: `${clientUrl}/login`,
        },
      });

      // Clear plain password after a short delay
      setTimeout(() => {
        this.userModel
          .updateOne({ _id: user._id }, { plainPassword: null })
          .catch((err) =>
            console.error('Failed to clear plain password for admin:', err),
          );
      }, 1000);

      // Send verification email for regular users
    } else {
      const verificationUrl = `${clientUrl}/auth/verify-email?token=${verificationToken}`;

      sendEmailAsync(this.mailerService, {
        to: email,
        subject: 'Verify Your Platform Ads Account ',
        template: 'verify-email',
        context: {
          username,
          email,
          role: role || 'user',
          verificationUrl,
          expirationTime: '1 hour',
          generatePassword, // Send password in verification email
        },
      });
    }

    const response = {
      userId: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      avatarLink: user.avatarLink,
      points: user.points,
      isActive: user.isActive,
      message: isActiveUser
        ? 'Admin account has been created and activated successfully. Please check your email for the password.'
        : 'Registration successful! Please check your email to verify your account.',
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

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({
      verificationToken: token,
    });

    if (!user) {
      return errorResponse(
        'Verification token is invalid or has already been used',
        400,
      );
    }

    // Check if token has expired - if yes, delete the account
    if (
      user.verificationExpiration &&
      user.verificationExpiration < new Date()
    ) {
      // Delete the expired unverified account
      await this.userModel.deleteOne({ _id: user._id });

      return errorResponse(
        'Verification token has expired and the account has been deleted. Please register again',
        400,
      );
    }

    // Check if account is already active
    if (user.isActive) {
      return errorResponse('This account has already been activated', 400);
    }

    // Activate the account
    await this.userModel.updateOne(
      { _id: user._id },
      {
        isActive: true,
        verificationToken: null,
        verificationExpiration: null,
      },
    );

    // Send welcome email after successful verification
    const clientUrl =
      this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';

    // send welcome email and include the plain password that was stored at registration
    sendEmailAsync(this.mailerService, {
      to: user.email,
      subject: 'Welcome to Platform Ads! 🎉',
      template: 'welcome',
      context: {
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        generatePassword: user.plainPassword || '********',
        role: user.role || 'user',
        loginUrl: `${clientUrl}/login`,
      },
    });

    // Clear plain password after a short delay
    setTimeout(() => {
      this.userModel
        .updateOne({ _id: user._id }, { plainPassword: null })
        .catch((err) =>
          console.error('Failed to clear plain password after welcome:', err),
        );
    }, 1000);

    return successResponse(
      {
        email: user.email,
        username: user.username,
      },
      'Account has been activated successfully! You can now log in',
      200,
    );
  }
}
