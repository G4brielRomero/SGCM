import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserPayload } from './types/user-payload.interface';
import {
  DoctorResponseDto,
  PatientResponseDto,
  UserResponseDto,
} from '../users/dto/user-response.dto';
import { UserType } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realizar login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Realizar logout' })
  async logout(@CurrentUser() user: UserPayload) {
    await this.authService.logout(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retornar usuário autenticado' })
  async me(@CurrentUser() user: UserPayload) {
    const currentUser = await this.authService.me(user);

    if (currentUser.type === UserType.DOCTOR) {
      return plainToInstance(DoctorResponseDto, currentUser, {
        excludeExtraneousValues: true,
      });
    }

    if (currentUser.type === UserType.PATIENT) {
      return plainToInstance(PatientResponseDto, currentUser, {
        excludeExtraneousValues: true,
      });
    }

    return plainToInstance(UserResponseDto, currentUser, {
      excludeExtraneousValues: true,
    });
  }
}