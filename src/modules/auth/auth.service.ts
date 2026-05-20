import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/auth.dto';
import { UserPayload } from './types/user-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);

    return this.generateAndSaveTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: UserPayload;

    try {
      payload = await this.jwtService.verifyAsync<UserPayload>(refreshToken, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const user = await this.usersService.findActiveById(payload.sub);

    if (!user.refreshToken || !user.refreshTokenJti) {
      throw new UnauthorizedException('Refresh token inválido ou já utilizado.');
    }

    if (user.refreshTokenJti !== payload.jti) {
      await this.usersService.updateRefreshToken(user.id, null, null);
      throw new UnauthorizedException('Refresh token inválido ou já utilizado.');
    }

    const isRefreshValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isRefreshValid) {
      await this.usersService.updateRefreshToken(user.id, null, null);
      throw new UnauthorizedException('Refresh token inválido ou já utilizado.');
    }

    return this.generateAndSaveTokens(user);
  }

  async logout(user: UserPayload): Promise<void> {
    await this.usersService.updateRefreshToken(user.sub, null, null);
  }

  async me(user: UserPayload): Promise<User> {
    return this.usersService.findActiveById(user.sub);
  }

  private async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    return user;
  }

  private async generateAndSaveTokens(user: User) {
    const basePayload = {
      sub: user.id,
      email: user.email,
      type: user.type,
    };

    const accessPayload: UserPayload = {
      ...basePayload,
      jti: randomUUID(),
    };

    const refreshPayload: UserPayload = {
      ...basePayload,
      jti: randomUUID(),
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.getAccessSecret(),
      expiresIn: this.getAccessExpiresIn(),
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getRefreshExpiresIn(),
    });

    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      this.getBcryptSaltRounds(),
    );

    await this.usersService.updateRefreshToken(
      user.id,
      refreshTokenHash,
      refreshPayload.jti,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private getAccessSecret(): string {
    const secret = this.config.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET não configurado no .env');
    }

    return secret;
  }

  private getRefreshSecret(): string {
    const secret =
      this.config.get<string>('JWT_REFRESH_SECRET') ??
      this.config.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET ou JWT_SECRET não configurado no .env');
    }

    return secret;
  }

  private getAccessExpiresIn(): StringValue {
    return this.config.get<string>('JWT_EXPIRES_IN', '15m') as StringValue;
  }

  private getRefreshExpiresIn(): StringValue {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as StringValue;
  }

  private getBcryptSaltRounds(): number {
    return parseInt(this.config.get<string>('BCRYPT_SALT_ROUNDS', '12'), 10);
  }
}