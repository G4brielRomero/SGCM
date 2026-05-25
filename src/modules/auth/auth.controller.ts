import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthService } from './auth.service';
import { ApiEnvelopeResponse, ApiUnauthorizedResponse } from '../../common/decorators/api-responses.decorator';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
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

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Realizar login',
    description: 'Autentica o usuário e retorna dois tokens: `accessToken` (válido por 15 minutos) e `refreshToken` (válido por 7 dias). Use o `accessToken` no cabeçalho `Authorization: Bearer {accessToken}` para acessar os endpoints protegidos. Quando o `accessToken` expirar, use o `refreshToken` em `POST /auth/refresh` para obter um novo par de tokens.',
  })
  @ApiEnvelopeResponse(AuthResponseDto, 200, 'Login realizado com sucesso.')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar token de acesso',
    description: 'Emite um novo par de tokens (`accessToken` e `refreshToken`) a partir de um `refreshToken` válido. O refresh token é de uso único — após ser utilizado, é imediatamente invalidado e substituído pelo novo. Tentativas de reutilizar o mesmo refresh token retornam 401 e invalidam a sessão por completo.',
  })
  @ApiEnvelopeResponse(AuthResponseDto, 200, 'Tokens renovados com sucesso.')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Realizar logout' })
  @ApiUnauthorizedResponse()
  async logout(@CurrentUser() user: UserPayload) {
    await this.authService.logout(user);
  }

  @Get('me')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retornar usuário autenticado' })
  @ApiUnauthorizedResponse()
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