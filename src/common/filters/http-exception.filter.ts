import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let title: string;
    let detail: string;
    let type: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Erros de validação do ValidationPipe retornam array de mensagens
      if (
        typeof exceptionResponse === 'object' &&
        (exceptionResponse as any).message
      ) {
        const msg = (exceptionResponse as any).message;
        detail = Array.isArray(msg) ? msg.join('; ') : String(msg);
      } else {
        detail = String(exceptionResponse);
      }

      title = this.getTitleForStatus(status);
      type = this.getTypeForStatus(status);
    } else if (this.isSqliteConstraintError(exception)) {
      // Violação de constraint UNIQUE no SQLite
      status = HttpStatus.CONFLICT;
      title = 'Conflito de recurso';
      type = 'https://sgcm.example.com/problems/conflict';
      detail = this.extractSqliteDetail(exception as any);
    } else {
      // Erro interno não previsto
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      title = 'Erro interno do servidor';
      type = 'https://sgcm.example.com/problems/internal-server-error';
      detail = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
      this.logger.error('Unhandled exception', exception);
    }

    response.status(status).json({
      type,
      title,
      detail,
      instance: request.url,
      method: request.method,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  private isSqliteConstraintError(exception: unknown): boolean {
    if (exception && typeof exception === 'object') {
      const err = exception as any;
      // SQLite UNIQUE constraint violation code
      return err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE';
    }
    return false;
  }

  private extractSqliteDetail(err: any): string {
    const msg: string = err.message ?? '';
    if (msg.includes('UNIQUE constraint failed')) {
      const field = msg.split('UNIQUE constraint failed: ')[1] ?? 'campo';
      return `Já existe um registro com o mesmo valor para: ${field}.`;
    }
    return 'Violação de constraint no banco de dados.';
  }

  private getTitleForStatus(status: number): string {
    const titles: Record<number, string> = {
      400: 'Requisição inválida',
      401: 'Não autenticado',
      403: 'Acesso negado',
      404: 'Recurso não encontrado',
      409: 'Conflito de recurso',
      500: 'Erro interno do servidor',
    };
    return titles[status] ?? 'Erro';
  }

  private getTypeForStatus(status: number): string {
    const types: Record<number, string> = {
      400: 'https://sgcm.example.com/problems/bad-request',
      401: 'https://sgcm.example.com/problems/unauthorized',
      403: 'https://sgcm.example.com/problems/forbidden',
      404: 'https://sgcm.example.com/problems/not-found',
      409: 'https://sgcm.example.com/problems/conflict',
      500: 'https://sgcm.example.com/problems/internal-server-error',
    };
    return types[status] ?? 'https://sgcm.example.com/problems/error';
  }
}
