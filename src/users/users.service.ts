import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { hashPasswordHelper } from '../helpers/util';

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
    const username = email.split('@')[0];
    const hashPassword = await hashPasswordHelper(password);
    const avatarUrl = `https://ui-avatars.com/api/?name=${username}&background=random&size=128`;
    const avatarLink = '';
    const points = 0;

    if (emailTaken) {
      throw new BadRequestException('Email is already taken');
    }

    if (phoneTaken) {
      throw new BadRequestException('Phone number is already taken');
    }

    const user = await this.userModel.create({
      username,
      email,
      password: hashPassword,
      phoneNumber,
      avatarUrl,
      avatarLink,
      points,
    });

    return {
      message: 'User created successfully',
      data: user,
    };
  }

  async findAll(_query: string, current?: number, pageSize?: number) {
    if (current == null) current = 1;
    if (pageSize == null) pageSize = 10;

    const totalItems = await this.userModel.countDocuments({});
    const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 0;
    const skip = (current - 1) * pageSize;

    const results = await this.userModel
      .find()
      .skip(skip)
      .limit(pageSize)
      .select('-password')
      .exec();

    return { totalItems, totalPages, currentPage: current, pageSize, results };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
