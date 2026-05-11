import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('SGCM — Sistema de Gestão de Clínica Médica')
    .setDescription('API para gerenciamento de usuários, especialidades e agendamentos.')
    .setVersion('1.0')
    .addBearerAuth() // preparação para autenticação JWT na Etapa 2
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🏥 SGCM rodando em http://localhost:${port}`);
  console.log(`📄 Documentação disponível em http://localhost:${port}/api`);
}

bootstrap();
