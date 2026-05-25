# SGCM — Sistema de Gestão de Clínica Médica

API REST construída com NestJS + TypeORM + SQLite para gestão de usuários, especialidades médicas e agendamentos, com autenticação JWT, autorização por perfil e padronização de respostas.

## Requisitos

- Node.js 20.11.0
- npm 10+
- SQLite

## Configuração Inicial

```bash
npm install
copy .env.example .env
npm run start:dev
```

A API estará disponível em:

```text
http://localhost:3000
```

Documentação Swagger:

```text
http://localhost:3000/api
```

## Variáveis de Ambiente

Exemplo de `.env`:

```env
PORT=3000
DATABASE_PATH=./database.db

JWT_SECRET=sgcm_access_secret_dev
JWT_REFRESH_SECRET=sgcm_refresh_secret_dev
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12
```

`JWT_SECRET` é obrigatório. Em produção, recomenda-se usar valores diferentes para `JWT_SECRET` e `JWT_REFRESH_SECRET`.

## Scripts

```bash
npm run start:dev
npm run build
npm run start
npm run seed
```

## Dados de Teste

Para popular o banco:

```bash
npm run seed
```

Usuários criados:

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | admin@sgcm.com | senha@123 |
| DOCTOR | rafael@sgcm.com | senha@123 |
| DOCTOR | ana@sgcm.com | senha@123 |
| PATIENT | joao@email.com | senha@123 |
| PATIENT | maria@email.com | senha@123 |

## Autenticação

O sistema utiliza JWT com dois tokens:

- `accessToken`: usado para acessar endpoints protegidos.
- `refreshToken`: usado para renovar a sessão.

### Login

```http
POST /auth/login
```

Body:

```json
{
  "email": "admin@sgcm.com",
  "password": "senha@123"
}
```

### Usando o token no Swagger

1. Acesse `http://localhost:3000/api`
2. Faça login em `/auth/login`
3. Copie o `accessToken`
4. Clique em **Authorize**
5. Informe:

```text
Bearer seu_access_token
```

## Segurança

O projeto utiliza:

- `JwtAuthGuard` global
- `RolesGuard` global
- `@Public()` para rotas públicas
- `@Roles()` para controle por perfil
- `@CurrentUser()` para acessar o usuário autenticado
- refresh token salvo com hash bcrypt
- refresh token rotation com `jti`

Perfis disponíveis:

- ADMIN
- DOCTOR
- PATIENT

## Controle de Acesso

### Usuários

| Método | Rota | Acesso |
|---|---|---|
| POST | `/users` | ADMIN |
| GET | `/users` | ADMIN |
| GET | `/users/:id` | ADMIN ou próprio usuário |
| PUT | `/users/:id` | ADMIN ou próprio usuário |
| DELETE | `/users/:id` | ADMIN |

### Médicos

| Método | Rota | Acesso |
|---|---|---|
| GET | `/doctors` | ADMIN, DOCTOR, PATIENT |
| GET | `/doctors/:id` | ADMIN, DOCTOR, PATIENT |
| GET | `/doctors/:id/specialties` | ADMIN, DOCTOR, PATIENT |
| GET | `/doctors/:id/schedules` | ADMIN ou próprio DOCTOR |

### Pacientes

| Método | Rota | Acesso |
|---|---|---|
| GET | `/patients` | ADMIN, DOCTOR |
| GET | `/patients/:id` | ADMIN, DOCTOR ou próprio PATIENT |
| GET | `/patients/:id/schedules` | ADMIN ou próprio PATIENT |

### Especialidades

| Método | Rota | Acesso |
|---|---|---|
| POST | `/specialties` | ADMIN |
| GET | `/specialties` | ADMIN, DOCTOR, PATIENT |
| GET | `/specialties/:id` | ADMIN, DOCTOR, PATIENT |
| PUT | `/specialties/:id` | ADMIN |
| DELETE | `/specialties/:id` | ADMIN |
| GET | `/specialties/:id/doctors` | ADMIN, DOCTOR, PATIENT |
| POST | `/doctors/:doctorId/specialties` | ADMIN |
| DELETE | `/doctors/:doctorId/specialties/:specialtyId` | ADMIN |

### Agendamentos

| Método | Rota | Acesso |
|---|---|---|
| POST | `/schedules` | ADMIN, PATIENT |
| GET | `/schedules` | ADMIN, DOCTOR, PATIENT |
| GET | `/schedules/:id` | ADMIN, próprio DOCTOR ou próprio PATIENT |
| PUT | `/schedules/:id` | ADMIN |
| PATCH | `/schedules/:id/status` | ADMIN, próprio DOCTOR ou próprio PATIENT |
| DELETE | `/schedules/:id` | ADMIN |

Regras importantes:

- PATIENT só cria agendamento para si mesmo.
- DOCTOR só visualiza seus próprios agendamentos.
- PATIENT só visualiza seus próprios agendamentos.
- PATIENT só pode cancelar o próprio agendamento.
- ADMIN possui acesso administrativo.

## Padrão de Respostas

Respostas de sucesso seguem o formato:

```json
{
  "data": {},
  "meta": {
    "timestamp": "2026-05-23T10:00:00.000Z",
    "path": "/resource"
  }
}
```

## Formato de Erros

Os erros seguem o padrão RFC 7807.

## Logging

Todas as requisições são registradas com:
- método HTTP
- URL
- status da resposta
- tempo de processamento
- IP do cliente

## Arquitetura

O projeto utiliza:
- NestJS
- TypeORM
- SQLite
- JWT
- Passport
- Swagger

## Decisões Técnicas

### STI

O sistema utiliza Single Table Inheritance para usuários e agendamentos.

### Soft Delete

Usuários são inativados com `isActive = false`.

### Refresh Token

O refresh token é salvo com hash bcrypt e possui rotação.

## Versões

- NestJS: 11.x
- TypeORM: 0.3.x
- Node.js: 20.11.0
- Banco de dados: SQLite (`sqlite3`)
