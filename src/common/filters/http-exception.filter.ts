import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor';

    const detail =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? Array.isArray((exceptionResponse as any).message)
          ? (exceptionResponse as any).message.join('; ')
          : (exceptionResponse as any).message
        : String(exceptionResponse);

    response.status(status).json({
      type: `https://sgcm.example.com/problems/${slugify(status)}`,
      title: getTitle(status),
      detail,
      instance: request.url,
      method: request.method,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}

function getTitle(status: number): string {
  const titles: Record<number, string> = {
    400: 'Requisição inválida',
    401: 'Não autorizado',
    403: 'Acesso negado',
    404: 'Recurso não encontrado',
    409: 'Conflito',
    422: 'Entidade não processável',
    500: 'Erro interno do servidor',
  };
  return titles[status] ?? 'Erro';
}

function slugify(status: number): string {
  return getTitle(status).toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}