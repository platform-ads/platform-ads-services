import { IsNotEmpty } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  phoneNumber: string;
}
