import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  _id: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @IsOptional()
  @Matches(/^(?:\+84|0)[35789]\d{8}$/, {
    message: 'Phone number must be a valid Vietnamese phone number',
  })
  phoneNumber?: string;

  @IsOptional()
  avatarLink?: string;

  @IsOptional()
  avatarUrl?: string;
}
