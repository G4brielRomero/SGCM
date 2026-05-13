import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('O token de acesso expirou.');
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('O token fornecido é inválido.');
    }

    if (err || !user) {
      throw new UnauthorizedException('Nenhum token de autenticação foi fornecido.');
    }

    return user;
  }
}