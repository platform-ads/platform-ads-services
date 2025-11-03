import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../decorators/metadata';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('admin')
  findAll(
    @Query() query: string,
    @Query('current') current: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.usersService.findAll(query, current, pageSize);
  }

  @Get('profile')
  @Roles('admin', 'user')
  getProfile() {
    return this.usersService.getProfile();
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch('me')
  @Roles('user')
  updateProfile(
    @Request() req: { user: { _id: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(String(req.user._id), updateUserDto);
  }
}
