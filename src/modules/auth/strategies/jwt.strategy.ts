import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../types/user-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET não configurado no .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: UserPayload): Promise<UserPayload> {
    if (!payload?.sub || !payload?.email || !payload?.type) {
      throw new UnauthorizedException('Token inválido.');
    }

    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Token inválido: utilize o accessToken para autenticação.');
    }

    return payload;
  }
}