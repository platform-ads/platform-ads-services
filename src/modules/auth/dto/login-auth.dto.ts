import { IsNotEmpty } from 'class-validator';

export class LoginAuthDto {
  @IsNotEmpty()
  emailOrUsername: string;

  @IsNotEmpty()
  password: string;
}
