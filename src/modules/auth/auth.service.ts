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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async signIn(user: UserDocument) {
    await this.userModel.updateOne(
      { _id: user._id },
      { lastLoginAt: new Date() },
    );

    const payload = {
      sub: user?._id,
      email: user?.email,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return successResponse({ access_token }, 'Sign in successful', 200);
  }

  async signUp(registerDto: CreateAuthDto) {
    const { email, password, phoneNumber, role, keySecret } = registerDto;

    const emailTaken = await this.usersService.isEmailTaken(email);

    if (emailTaken) {
      return errorResponse('Email is already taken', 400);
    }

    const phoneTaken = await this.usersService.isPhoneNumberTaken(phoneNumber);

    if (phoneTaken) {
      return errorResponse('Phone number is already taken', 400);
    }

    const username = email.split('@')[0];

    const hashPassword = await hashPasswordHelper(password);

    const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=random&size=128`;
    const avatarLink = '';
    const points = 0;

    if (role === 'admin') {
      if (keySecret !== process.env.ADMIN_KEY_SECRET) {
        return errorResponse('Invalid key secret for admin registration', 403);
      }
    }

    const user = await this.userModel.create({
      role: role || 'user',
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

  async logOut(user: UserDocument) {
    const existingUser = await this.usersService.findById(user._id.toString());

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    await this.userModel.updateOne(
      { _id: user._id },
      { lastLogoutAt: new Date() },
    );

    return successResponse(null, 'Logout successful', 200);
  }
}
