import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@sgcm.com' })
  @IsEmail({}, { message: 'E-mail deve ter formato válido' })
  email: string;

  @ApiProperty({ example: 'senha@123' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'cole_o_refresh_token_aqui' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  @IsString()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'access_token_jwt' })
  accessToken: string;

  @ApiProperty({ example: 'refresh_token_jwt' })
  refreshToken: string;
}