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
import { Roles } from '../../decorators/metadata';
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
  @UseGuards(LocalAuthGuard)
  signIn(@Request() req: RequestWithUser) {
    return this.authService.signIn(req.user);
  }

  @Post('signup')
  signUp(@Body() registerDto: CreateAuthDto) {
    return this.authService.signUp(registerDto);
  }

  @Post('logout')
  @Roles('admin', 'user')
  logOut(@Request() req: RequestWithUser) {
    return this.authService.logOut(req.user);
  }

  @Get('mail')
  async testMail() {
    try {
      await this.mailerService.sendMail({
        to: 'ledaian22@gmail.com',
        from: 'noreply@nestjs.com',
        subject: 'Testing Nest MailerModule ✔',
        text: 'welcome',
        html: '<b>welcome</b>',
      });
      return successResponse(null, 'Email sent successfully', 200);
    } catch (error) {
      console.error('Email sending failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return successResponse(
        { error: errorMessage },
        'Failed to send email',
        500,
      );
    }
  }
}
