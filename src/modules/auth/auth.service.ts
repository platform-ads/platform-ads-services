import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(user: UserDocument) {
    const payload = {
      sub: user?._id,
      email: user?.email,
    };

    return {
      message: 'Sign in successful',
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async validateUser(createAuthDto: CreateAuthDto): Promise<User | null> {
    const { email, password } = createAuthDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !password) {
      return null;
    }

    return user;
  }
}
