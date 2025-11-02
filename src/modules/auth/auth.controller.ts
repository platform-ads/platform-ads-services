import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { Public } from 'src/decorators/metadata';
import { CreateAuthDto } from './dto/create-auth.dto';
import { successResponse } from '../../helpers/response';
import { MailerService } from '@nestjs-modules/mailer';

interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
  ) {}

  @Post('signin')
  @Public()
  @UseGuards(LocalAuthGuard)
  signIn(@Request() req: RequestWithUser) {
    return this.authService.signIn(req.user);
  }

  @Post('signup')
  @Public()
  signUp(@Body() registerDto: CreateAuthDto) {
    return this.authService.signUp(registerDto);
  }

  @Get('profile')
  getProfile(@Request() req: RequestWithUser) {
    return successResponse(req.user, 'Profile retrieved successfully', 200);
  }

  @Get('mail')
  @Public()
  testMail() {
    this.mailerService
      .sendMail({
        to: 'ledaian22@gmail.com',
        from: 'noreply@nestjs.com',
        subject: 'Testing Nest MailerModule ✔',
        text: 'welcome',
        html: '<b>welcome</b>',
      })
      .then(() => {})
      .catch(() => {});

    return 'ok';
  }
}
