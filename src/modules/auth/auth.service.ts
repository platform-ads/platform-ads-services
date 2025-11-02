import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { comparePasswordHelper } from 'src/helpers/util';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(createAuthDto: CreateAuthDto): Promise<any> {
    const { email, password } = createAuthDto;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Cannot find user with given email');
    }

    const isValidPassword = await comparePasswordHelper(
      password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload = {
      sub: user?._id,
      username: user?.email,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
