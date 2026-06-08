# SGCM — Sistema de Gestão de Clínica Médica

API REST para gestão completa do ciclo clínico de uma clínica médica: autenticação de usuários (Admin, Médico, Paciente), cadastro de especialidades, agendamentos (presencial, online e domiciliar), atendimentos (consulta, exame e retorno), procedimentos (simples e especializados com ciclo de autorização), prontuários clínicos, laudos em PDF com validação pública e relatórios administrativos consolidados.

## Tecnologias e Versões

| Tecnologia | Versão |
|---|---|
| Node.js | 20.11.0 |
| TypeScript | 5.x |
| NestJS | 11.1.x |
| TypeORM | 0.3.29 |
| SQLite (`sqlite3`) | 5.1.x |
| pdfkit | 0.18.x |

## Instalação e Execução

### 1. Clonar o repositório

```bash
git clone https://github.com/G4brielRomero/SGCM.git
cd SGCM
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` se necessário (os valores padrão do `.env.example` funcionam para desenvolvimento local).

### 4. Popular o banco com dados de teste

```bash
npm run seed
```

Este comando cria o arquivo `database.db`, define o schema e insere usuários, especialidades, agendamentos, atendimentos, procedimentos, prontuários e laudos de exemplo.

### 5. Iniciar o servidor

Para desenvolvimento (hot reload):

```bash
npm run start:dev
```

Para produção (requer `npm run build` antes):

```bash
npm run build
npm run start
```

A API estará disponível em:

```
http://localhost:3000
```

Documentação interativa (Swagger):

```
http://localhost:3000/api
```

> Se a porta 3000 estiver ocupada, defina `PORT=3001` no `.env` e acesse `http://localhost:3001/api`.

---

## Variáveis de Ambiente

Todas as variáveis estão em `.env.example`. Copie para `.env` antes do primeiro uso.

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta em que o servidor HTTP escuta |
| `DATABASE_PATH` | `./database.db` | Caminho do arquivo SQLite |
| `JWT_SECRET` | `sgcm_access_secret_dev` | Chave de assinatura do `accessToken` — **obrigatório** |
| `JWT_REFRESH_SECRET` | `sgcm_refresh_secret_dev` | Chave de assinatura do `refreshToken` |
| `JWT_EXPIRES_IN` | `15m` | Validade do `accessToken` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Validade do `refreshToken` |
| `BCRYPT_SALT_ROUNDS` | `12` | Fator de custo do bcrypt para senhas e refresh tokens |

> Em produção use valores longos e aleatórios para `JWT_SECRET` e `JWT_REFRESH_SECRET`.

---

## Credenciais de Teste

Criadas pelo `npm run seed`. Todos os usuários usam a mesma senha.

| Perfil | E-mail | Senha | Informações adicionais |
|---|---|---|---|
| ADMIN | admin@sgcm.com | senha@123 | Acesso irrestrito |
| DOCTOR | rafael@sgcm.com | senha@123 | CRM 12345-SP · Cardiologia, Dermatologia |
| DOCTOR | ana@sgcm.com | senha@123 | CRM 67890-RJ · Ortopedia |
| PATIENT | joao@email.com | senha@123 | CPF 529.982.247-25 |
| PATIENT | maria@email.com | senha@123 | CPF 390.533.447-05 |

---

## Testando o Endpoint Público de Validação

O endpoint `GET /reports/validate/{code}` não requer autenticação. Após executar `npm run seed`, os dois códigos abaixo estão disponíveis:

| Status | validationCode | Descrição |
|---|---|---|
| ACTIVE | `3c4e5f6a-7b8c-4d9e-8a0b-1c2d3e4f5a6b` | Laudo de Radiografia lombar — Dra. Ana / Maria |
| REVOKED | `9f8e7d6c-5b4a-4321-9a8b-7c6d5e4f3a2b` | Laudo de ECG revogado por identificação incorreta |

Exemplos de requisição:

```http
GET http://localhost:3000/reports/validate/3c4e5f6a-7b8c-4d9e-8a0b-1c2d3e4f5a6b
GET http://localhost:3000/reports/validate/9f8e7d6c-5b4a-4321-9a8b-7c6d5e4f3a2b
```

---

## Autenticação

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@sgcm.com",
  "password": "senha@123"
}
```

A resposta contém `accessToken` (válido 15 min) e `refreshToken` (válido 7 dias).

### Usando o token no Swagger

1. Acesse `http://localhost:3000/api`
2. Execute `POST /auth/login`
3. Copie o valor de `data.accessToken`
4. Clique em **Authorize** (canto superior direito)
5. Cole o token no campo `Value` — **sem** o prefixo `Bearer`
6. Clique em **Authorize**

### Renovando o token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "seu_refresh_token"
}
```

O refresh token é de uso único — cada chamada emite um novo par de tokens e invalida o anterior.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run start:dev` | Inicia o servidor em modo desenvolvimento com hot reload |
| `npm run build` | Compila o TypeScript para `dist/` via NestJS CLI |
| `npm run start` | Executa o binário compilado em `dist/main.js` |
| `npm run seed` | Cria e popula o banco SQLite com dados de teste |

---

## Módulos Principais

| Módulo | Prefixo de rota | Descrição |
|---|---|---|
| Auth | `/auth` | Login, refresh, logout e perfil do usuário autenticado |
| Users | `/users` | Gestão de todos os usuários (ADMIN) |
| Doctors | `/doctors` | Perfis de médicos, especialidades, agendamentos e atendimentos |
| Patients | `/patients` | Perfis de pacientes, agendamentos e atendimentos |
| Specialties | `/specialties` | Cadastro de especialidades e vínculo com médicos |
| Schedules | `/schedules` | Agendamentos presenciais, online e domiciliares |
| Appointments | `/appointments` | Consultas, exames e retornos gerados a partir de agendamentos |
| Procedures | `/appointments/:id/procedures` | Procedimentos simples e especializados realizados nos atendimentos |
| Medical Records | `/records`, `/appointments/:id/records` | Prontuários clínicos gerados ao encerramento dos atendimentos |
| Reports | `/reports`, `/appointments/:id/report` | Laudos em PDF com código único de validação pública |
| Admin Reports | `/admin/reports` | Relatórios consolidados de agendamentos, atendimentos, procedimentos e ocupação de agenda |

---

## Padrão de Respostas

### Sucesso

```json
{
  "data": { },
  "meta": {
    "timestamp": "2026-06-07T09:00:00.000Z",
    "path": "/resource"
  }
}
```

Listagens paginadas incluem `totalItems`, `page`, `limit` e `totalPages` no `meta`.

### Erros (RFC 7807)

```json
{
  "type": "https://sgcm.example.com/problems/not-found",
  "title": "Recurso não encontrado",
  "status": 404,
  "detail": "Médico com id 15 não foi encontrado.",
  "instance": "/doctors/15",
  "method": "GET",
  "timestamp": "2026-06-07T09:00:00.000Z"
}
```

---

## Dados de Teste Criados pelo Seed

Além dos usuários, o seed cria um conjunto completo de dados que cobre os fluxos de todas as etapas:

| Recurso | Quantidade | Detalhes |
|---|---|---|
| Especialidades | 3 | Cardiologia, Dermatologia, Ortopedia |
| Agendamentos | 10 | 2 PENDING, 2 CONFIRMED, 1 CANCELLED, 5 COMPLETED |
| Atendimentos | 5 | 1 CONSULTATION IN_PROGRESS, 2 CONSULTATION FINISHED, 1 EXAM FINISHED, 1 FOLLOW_UP FINISHED |
| Procedimentos | 3 | 1 SIMPLE, 1 SPECIALIZED PENDING, 1 SPECIALIZED AUTHORIZED |
| Prontuários | 2 | Para os atendimentos CONSULTATION e FOLLOW_UP encerrados |
| Laudos | 2 | 1 ACTIVE, 1 REVOKED |

**Agendamentos CONFIRMED prontos para criar atendimento:**

```http
POST /appointments
{ "scheduleId": 3, "type": "CONSULTATION", "reason": "Dor torácica" }
POST /appointments
{ "scheduleId": 4, "type": "EXAM", "examType": "hemograma" }
```

> Os IDs exatos são exibidos no output do `npm run seed`.
