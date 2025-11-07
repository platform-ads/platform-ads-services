import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper, comparePasswordHelper } from '../../helpers/util';
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from '../../helpers/response';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  isEmailTaken = async (email: string | undefined) => {
    const user = await this.userModel.exists({ email });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return user;
  };

  isPhoneNumberTaken = async (phoneNumber: string | undefined) => {
    const user = await this.userModel.exists({ phoneNumber });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return user;
  };

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const { email, phoneNumber, oldPassword, newPassword, avatarLink } =
      updateUserDto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (email && email !== user.email) {
      const emailExists = await this.userModel.findOne({ email });
      if (emailExists) {
        return errorResponse('Email already in use', 400);
      }
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const phoneExists = await this.userModel.findOne({ phoneNumber });
      if (phoneExists) {
        return errorResponse('Phone number already in use', 400);
      }
    }

    if (newPassword) {
      if (!oldPassword) {
        return errorResponse(
          'Old password is required to set new password',
          400,
        );
      }

      const isPasswordValid = await comparePasswordHelper(
        oldPassword,
        user.password,
      );
      if (!isPasswordValid) {
        return errorResponse('Old password is incorrect', 400);
      }

      const hashedPassword = await hashPasswordHelper(newPassword);
      user.password = hashedPassword;
    }

    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (avatarLink) user.avatarLink = avatarLink;

    user.updatedAt = new Date();

    await user.save();

    const response = {
      _id: user._id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl || '',
      avatarLink: user.avatarLink || '',
      points: user.points,
    };

    return successResponse(response, 'Profile updated successfully', 200);
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, phoneNumber } = createUserDto;

    await this.isEmailTaken(email);
    await this.isPhoneNumberTaken(phoneNumber);

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

    return successResponse(user, 'User created successfully', 201);
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -refreshToken');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user, 'Profile retrieved successfully', 200);
  }

  async findAll(_query: string, current?: number, pageSize?: number) {
    const currentNum = current == null ? 1 : Number(current);
    const pageSizeNum = pageSize == null ? 10 : Number(pageSize);

    const totalItems = await this.userModel.countDocuments({});
    const totalPages = totalItems ? Math.ceil(totalItems / pageSizeNum) : 0;
    const skip = (currentNum - 1) * pageSizeNum;

    const results = await this.userModel
      .find()
      .skip(skip)
      .limit(pageSizeNum)
      .select('-password -refreshToken');

    return paginatedResponse(
      results,
      {
        currentPage: currentNum,
        pageSize: pageSizeNum,
        totalItems,
        totalPages,
      },
      'Users retrieved successfully',
      200,
    );
  }

  async findByEmail(email: string) {
    return await this.userModel.findOne({ email });
  }

  async findByUsername(username: string) {
    return await this.userModel.findOne({ username });
  }

  async findByEmailOrUsername(emailOrUsername: string) {
    return await this.userModel.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
  }

  async findById(id: string) {
    return await this.userModel.findById(id);
  }

  findOne(id: number) {
    return successResponse(null, `This action returns a #${id} user`, 200);
  }
}
