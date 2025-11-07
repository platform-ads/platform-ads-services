import { IsNotEmpty, IsOptional, MinLength, Matches } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  phoneNumber: string;

  @MinLength(8)
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @IsOptional()
  role?: string;

  @IsOptional()
  keySecret?: string;
}
