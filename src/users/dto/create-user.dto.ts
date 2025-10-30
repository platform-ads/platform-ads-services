import { IsNotEmpty, IsEmail, MinLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(8)
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @IsNotEmpty()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'Phone number must be a valid Vietnamese phone number',
  })
  phoneNumber?: string;
}
