import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ResponseEnvelope<T> {
  data: T;
  meta: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Não transforma se não houver corpo (204 No Content) ou se for null/undefined
        if (response.statusCode === 204 || data === null || data === undefined) {
          return data;
        }

        const timestamp = new Date().toISOString();
        const path = request.url;

        // Se já for uma resposta paginada (possui data e meta)
        if (data.data && data.meta) {
          data.meta = { ...data.meta, timestamp, path };
          return data;
        }

        // Resposta de recurso único
        return {
          data,
          meta: { timestamp, path },
        };
      }),
    );
  }
}