import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '../../helpers/util';
import { successResponse, paginatedResponse } from '../../helpers/response';
import { UpdateUserDto } from './dto/update-user.dto';
import mongoose from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  isEmailTaken = async (email: string | undefined) => {
    const user = await this.userModel.exists({ email });
    return !!user;
  };

  isPhoneNumberTaken = async (phoneNumber: string | undefined) => {
    const user = await this.userModel.exists({ phoneNumber });
    return !!user;
  };

  async create(createUserDto: CreateUserDto) {
    const { email, password, phoneNumber } = createUserDto;

    const emailTaken = await this.isEmailTaken(email);
    const phoneTaken = await this.isPhoneNumberTaken(phoneNumber);

    if (emailTaken) {
      throw new BadRequestException('Email is already taken');
    }

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

    return successResponse(user, 'User created successfully', 201);
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
      .select('-password');

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

  findOne(id: number) {
    return successResponse(null, `This action returns a #${id} user`, 200);
  }

  async update(updateUserDto: UpdateUserDto) {
    const result = await this.userModel.updateOne(
      { _id: updateUserDto._id },
      updateUserDto,
    );
    return successResponse(result, 'User updated successfully', 200);
  }

  async remove(_id: string) {
    if (!mongoose.isValidObjectId(_id)) {
      throw new BadRequestException('Invalid user ID');
    }

    await this.userModel.deleteOne({ _id });

    return successResponse(null, `User #${_id} removed successfully`, 200);
  }
}
