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
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5Ac2djbS5jb20iLCJ0eXBlIjoiQURNSU4iLCJqdGkiOiJkZWYwMTIzNC01Njc4LTkwYWItY2RlZi0xMjM0NTY3ODkwYWIiLCJpYXQiOjE3MTYwMDAwMDAsImV4cCI6MTcxNjYwNDgwMH0.Qm7UWZMGbmLzNWfLkqQJZPb8kYGVf9n3N7R1V2kDrMw' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  @IsString()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5Ac2djbS5jb20iLCJ0eXBlIjoiQURNSU4iLCJqdGkiOiJhYmMxMjM0NS02Nzg5LTBhYmMtZGVmMS0yMzQ1Njc4OTBhYmMiLCJpYXQiOjE3MTYwMDAwMDAsImV4cCI6MTcxNjAwMDkwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5Ac2djbS5jb20iLCJ0eXBlIjoiQURNSU4iLCJqdGkiOiJkZWYwMTIzNC01Njc4LTkwYWItY2RlZi0xMjM0NTY3ODkwYWIiLCJpYXQiOjE3MTYwMDAwMDAsImV4cCI6MTcxNjYwNDgwMH0.Qm7UWZMGbmLzNWfLkqQJZPb8kYGVf9n3N7R1V2kDrMw' })
  refreshToken: string;
}