# SGCM — Sistema de Gestão de Clínica Médica

API REST construída com NestJS + TypeORM + SQLite para gestão de usuários, especialidades e agendamentos.

## Requisitos

- Node.js 20.11.0 (use `nvm use` na raiz do projeto)
- npm 10+

## Configuração Inicial

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
cp .env.example .env

# 3. Iniciar em modo desenvolvimento
npm run start:dev
```

A API estará disponível em: http://localhost:3000  
Documentação Swagger: http://localhost:3000/api

## Versões Utilizadas

- NestJS: 11.x
- TypeORM: 0.3.x
- Node.js: 20.11.0
- Banco de dados: SQLite (better-sqlite3)

## Estrutura do Projeto

```
src/
├── main.ts                    # Bootstrap da aplicação
├── app.module.ts              # Módulo raiz
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts   # Filtro global RFC 7807
│   └── dto/
│       └── pagination-query.dto.ts    # DTO e helpers de paginação
└── modules/
    ├── users/                 # Usuários (Admin, Doctor, Patient)
    │   ├── entities/
    │   ├── dto/
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   └── users.module.ts
    ├── specialties/           # Especialidades médicas
    │   ├── entities/
    │   ├── dto/
    │   ├── specialties.controller.ts
    │   ├── specialties.service.ts
    │   └── specialties.module.ts
    └── schedules/             # Agendamentos (IN_PERSON, ONLINE, HOME)
        ├── entities/
        ├── dto/
        ├── schedules.controller.ts
        ├── schedules.service.ts
        └── schedules.module.ts
```

## Endpoints Principais

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /users | Criar usuário (ADMIN/DOCTOR/PATIENT) |
| GET | /users | Listar com filtro por type |
| GET | /users/:id | Buscar por ID |
| PUT | /users/:id | Atualizar |
| DELETE | /users/:id | Inativar (soft delete) |

### Médicos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /doctors | Listar com especialidades |
| GET | /doctors/:id | Buscar por ID |
| GET | /doctors/:id/specialties | Especialidades do médico |
| POST | /doctors/:id/specialties | Associar especialidade |
| DELETE | /doctors/:id/specialties/:sid | Desassociar especialidade |
| GET | /doctors/:id/schedules | Agendamentos do médico |

### Pacientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /patients | Listar pacientes |
| GET | /patients/:id | Buscar por ID |
| GET | /patients/:id/schedules | Agendamentos do paciente |

### Especialidades
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /specialties | Criar |
| GET | /specialties | Listar |
| GET | /specialties/:id | Buscar por ID |
| PUT | /specialties/:id | Atualizar |
| DELETE | /specialties/:id | Excluir |
| GET | /specialties/:id/doctors | Médicos da especialidade |

### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /schedules | Criar agendamento |
| GET | /schedules | Listar com filtros |
| GET | /schedules/:id | Buscar por ID |
| PUT | /schedules/:id | Atualizar |
| PATCH | /schedules/:id/status | Atualizar status (CONFIRMED/CANCELLED) |
| DELETE | /schedules/:id | Excluir |

## Decisões Arquiteturais

### Estratégia de Herança: Single Table Inheritance (STI)
- **User**: STI com coluna `type` discriminando ADMIN/DOCTOR/PATIENT em uma única tabela `users`
- **Schedule**: STI com coluna `type` discriminando IN_PERSON/ONLINE/HOME em uma única tabela `schedules`
- **Justificativa**: STI é adequado quando as subclasses compartilham muitos atributos e as consultas frequentemente precisam retornar registros mistos (ex: todos os agendamentos de um médico, independente da modalidade). O SQLite não tem suporte completo a `RETURNING`, tornando STI mais compatível que CTI.

### Soft Delete de Usuários
- Usuários são inativados (`isActive = false`) em vez de removidos fisicamente
- Preserva histórico de agendamentos e referências
- Listagens filtram automaticamente registros inativos

### Exportação do UsersService
- `UsersModule` exporta `UsersService` integralmente para uso em `SchedulesModule` e futuro `AppointmentsModule`
- Métodos `findDoctorOrFail` e `findPatientOrFail` fornecem interface clara para outros módulos

### Verificação de Unicidade
- Feita no service antes de persistir (verificação explícita)
- Produz mensagens de erro descritivas
- Fallback no filtro global para erros de constraint do SQLite

### Status de Agendamento
- PENDING → CONFIRMED ou CANCELLED
- CONFIRMED → CANCELLED (via API) ou COMPLETED (apenas via AppointmentsService na Etapa 3)
- COMPLETED → nenhuma transição permitida
- O valor COMPLETED é rejeitado no endpoint PATCH /schedules/:id/status

### Campos cancelledBy e createdBy
- Existem no modelo mas são nulos na Etapa 1
- Serão preenchidos com `@CurrentUser()` na Etapa 2 após implementação do JWT

## Formato de Erros (RFC 7807)

```json
{
  "type": "https://sgcm.example.com/problems/not-found",
  "title": "Recurso não encontrado",
  "detail": "Médico com id 15 não foi encontrado.",
  "instance": "/doctors/15",
  "method": "GET",
  "status": 404,
  "timestamp": "2026-04-13T20:29:41.234Z"
}
```

## Paginação

Todos os endpoints de listagem retornam:

```json
{
  "data": [],
  "meta": {
    "totalItems": 20,
    "page": 2,
    "limit": 10,
    "totalPages": 5
  }
}
```

Parâmetros: `page`, `limit`, `sort` (ex: `name:asc`), `search`
