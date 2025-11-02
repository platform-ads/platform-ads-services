import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '../../helpers/util';
import { successResponse } from '../../helpers/response';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async signIn(user: UserDocument) {
    const payload = {
      sub: user?._id,
      email: user?.email,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return successResponse({ access_token }, 'Sign in successful', 200);
  }

  async signUp(registerDto: CreateAuthDto) {
    const { email, password, phoneNumber } = registerDto;

    const emailTaken = await this.usersService.isEmailTaken(email);

    if (emailTaken) {
      throw new BadRequestException('Email is already taken');
    }

    const phoneTaken = await this.usersService.isPhoneNumberTaken(phoneNumber);

    if (phoneTaken) {
      throw new BadRequestException('Phone number is already taken');
    }

    const username = email.split('@')[0];

    const hashPassword = await hashPasswordHelper(password);

    const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=random&size=128`;
    const avatarLink = '';
    const points = 0;

    const user = await this.userModel.create({
      username,
      email,
      password: hashPassword,
      phoneNumber,
      avatarUrl,
      avatarLink,
      points,
    });

    const {
      password: _password,
      codeId: _codeId,
      codeExpiration: _codeExpiration,
      ...userObject
    } = user.toObject();

    return successResponse(userObject, 'User registered successfully', 201);
  }

  async validateUser(loginDto: LoginAuthDto): Promise<User | null> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !password) {
      return null;
    }

    return user;
  }
}
