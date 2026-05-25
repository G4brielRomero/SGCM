import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

const problemDetailSchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'number' },
    detail: { type: 'string' },
    instance: { type: 'string' },
    method: { type: 'string' },
    timestamp: { type: 'string' },
  },
};

export const ApiUnauthorizedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'Token ausente, inválido ou expirado.',
    content: {
      'application/json': {
        examples: {
          token_ausente: {
            summary: 'Sem token',
            value: {
              type: 'https://sgcm.example.com/problems/unauthorized',
              title: 'Não autenticado',
              status: 401,
              detail: 'Nenhum token de autenticação foi fornecido.',
              instance: '/schedules',
              method: 'GET',
              timestamp: '2026-05-22T10:00:00.000Z',
            },
          },
          token_expirado: {
            summary: 'Token expirado',
            value: {
              type: 'https://sgcm.example.com/problems/unauthorized',
              title: 'Não autenticado',
              status: 401,
              detail: 'O token de acesso expirou.',
              instance: '/schedules',
              method: 'GET',
              timestamp: '2026-05-22T10:00:00.000Z',
            },
          },
          token_invalido: {
            summary: 'Token inválido',
            value: {
              type: 'https://sgcm.example.com/problems/unauthorized',
              title: 'Não autenticado',
              status: 401,
              detail: 'O token fornecido é inválido.',
              instance: '/schedules',
              method: 'GET',
              timestamp: '2026-05-22T10:00:00.000Z',
            },
          },
        },
        schema: problemDetailSchema,
      },
    },
  });

export const ApiForbiddenResponse = (detail = 'Seu perfil não tem permissão para realizar esta operação.', instance = '/resource') =>
  ApiResponse({
    status: 403,
    description: 'Perfil sem permissão para este recurso.',
    content: {
      'application/json': {
        example: {
          type: 'https://sgcm.example.com/problems/forbidden',
          title: 'Acesso negado',
          status: 403,
          detail,
          instance,
          method: 'GET',
          timestamp: '2026-05-22T10:00:00.000Z',
        },
        schema: problemDetailSchema,
      },
    },
  });

const metaSchema = {
  type: 'object',
  properties: {
    timestamp: { type: 'string', example: '2026-01-01T10:00:00.000Z' },
    path: { type: 'string', example: '/resource/1' },
  },
};

export const ApiEnvelopeResponse = <T>(model: Type<T>, status = 200, description?: string) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        properties: {
          data: { $ref: getSchemaPath(model) },
          meta: metaSchema,
        },
      },
    }),
  );

export const ApiPaginatedResponse = <T>(model: Type<T>, description?: string) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 200,
      description,
      schema: {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: {
            type: 'object',
            properties: {
              totalItems: { type: 'number', example: 100 },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              totalPages: { type: 'number', example: 5 },
              timestamp: { type: 'string', example: '2026-01-01T10:00:00.000Z' },
              path: { type: 'string', example: '/resource' },
            },
          },
        },
      },
    }),
  );
