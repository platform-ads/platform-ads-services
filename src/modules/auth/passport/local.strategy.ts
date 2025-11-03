import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'emailOrUsername' });
  }

  async validate(emailOrUsername: string, password: string): Promise<User> {
    const user = await this.authService.validateUser({
      emailOrUsername,
      password,
    });

    if (!user) {
      throw new UnauthorizedException(
        'Cannot find user with given email or username',
      );
    }

    if (!password) {
      throw new UnauthorizedException('Password is required');
    }

    // Check if account is activated
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account has not been activated. Please check your email to verify your account.',
      );
    }

    return user;
  }
}
