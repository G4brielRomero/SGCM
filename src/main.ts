import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Filtro global de exceções — formato RFC 7807
  app.useGlobalFilters(new HttpExceptionFilter());

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // rejeita requisições com campos desconhecidos
      transform: true,           // converte automaticamente os tipos dos campos
    }),
  );

  // Serialização global — garante que @Exclude() nos DTOs de resposta seja respeitado
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('SGCM — Sistema de Gestão de Clínica Médica')
    .setDescription(`
API completa para gerenciamento de clínica médica, cobrindo o ciclo clínico completo — do agendamento ao laudo.

## Autenticação
A maioria dos endpoints requer autenticação JWT. Para autenticar:
1. Faça login em **POST /auth/login** com e-mail e senha.
2. Copie o \`accessToken\` retornado no campo \`data.accessToken\`.
3. Clique em **Authorize** no topo desta página e insira o token no formato \`Bearer {token}\`.

O token de acesso expira em 15 minutos. Use **POST /auth/refresh** com o \`refreshToken\` para obter um novo par de tokens sem precisar fazer login novamente.

## Perfis de Usuário
- **Admin**: acesso irrestrito a todos os recursos do sistema.
- **Doctor**: acesso aos próprios atendimentos, procedimentos, prontuários e laudos.
- **Patient**: acesso aos próprios agendamentos, prontuários e laudos.

## Endpoint Público
O endpoint \`GET /reports/validate/{code}\` **não requer autenticação** e pode ser usado por qualquer pessoa que possua o código de validação para verificar a autenticidade de um laudo emitido pelo sistema.

## Módulos Principais
- **Auth** — login, refresh, logout e perfil do usuário autenticado.
- **Users / Doctors / Patients** — gestão de usuários por perfil.
- **Specialties** — especialidades médicas e vínculo com médicos.
- **Schedules** — agendamentos de consultas, exames e retornos.
- **Appointments** — atendimentos clínicos gerados a partir de agendamentos confirmados.
- **Procedures** — procedimentos realizados durante atendimentos, com ciclo de autorização para procedimentos especializados.
- **Medical Records** — prontuários clínicos gerados ao encerramento de atendimentos.
- **Reports** — laudos em PDF para exames encerrados, com código único de validação.
- **Admin** — relatórios administrativos consolidados (agendamentos, atendimentos, procedimentos e ocupação de agenda).
    `)
    .setVersion('3.0.0')
    .addTag('Auth', 'Login, refresh de token, logout e perfil do usuário autenticado.')
    .addTag('Users', 'Gestão de usuários do sistema (ADMIN).')
    .addTag('Doctors', 'Perfis de médicos e seus sub-recursos: agendamentos, atendimentos, especialidades, prontuários e laudos.')
    .addTag('Patients', 'Perfis de pacientes e seus sub-recursos: agendamentos, atendimentos, prontuários e laudos.')
    .addTag('Specialties', 'Cadastro de especialidades médicas.')
    .addTag('Schedules', 'Agendamentos de consultas, exames e retornos.')
    .addTag('Appointments', 'Atendimentos clínicos gerados a partir de agendamentos confirmados.')
    .addTag('Procedures', 'Procedimentos realizados durante atendimentos, com ciclo de autorização para procedimentos especializados.')
    .addTag('Medical Records', 'Prontuários clínicos gerados ao encerramento de atendimentos.')
    .addTag('Reports', 'Laudos em PDF para exames encerrados, com código único de validação pública.')
    .addTag('Admin Reports', 'Relatórios administrativos consolidados — exclusivo para ADMIN.')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido em POST /auth/login',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🏥 SGCM rodando em http://localhost:${port}`);
  console.log(`📄 Documentação disponível em http://localhost:${port}/api`);
}

bootstrap();
