# Relatório Técnico — SGCM

## Sistema de Gestão de Clínica Médica

**Disciplina:** Desenvolvimento Web 2  
**Entrega:** Etapa 2  
**Integrantes:** Gabriel, Murilo, João  
**Data:** Maio de 2026

1> Integrantes e contribuições

Participação de todos: Desenvolvimento inicial com estruturação, entidades,
controllers, service, module, dto, filtros, relatório e testes. Implementações principais, como por exemplo auth, interception, middleware e etc.

Gabriel Romero: Correção de incoerências na atualização dos CPFS, criação do problemDetailDto para as respostas de erro, testes de caso em maneira geral.

Murilo José Silva: Adicionando comentários para melhor entendimento, correção de conflito em agendamento, validações de dto, serialização e testes. Fix de token e refresh token que estava sendo possivel usar mesmo depois de solicitar um novo token. Atualização parcial do diagrama.

João Pedro Martin Turina: Testes e correções de funcionamento das requisições e endpoints, adição de decorator. Implementação de Transform Intercpetor e Exception Filter

2> Diagrama de classes

O diagrama de classes da Etapa 1 permanece válido estruturalmente.  
As alterações desta etapa concentraram-se principalmente na infraestrutura transversal da aplicação e no sistema de autenticação/autorização com JWT, sem mudanças relevantes na hierarquia principal das entidades.

As principais alterações desta etapa foram:
- inclusão de campos relacionados ao refresh token;
- auditoria de usuário autenticado em agendamentos;
- guards globais;
- middleware de logging;
- interceptor global;
- exception filter expandido para autenticação e autorização.

3> Decisões Técnicas

### Estratégia de Guards

Decisão: Optamos por registrar o `JwtAuthGuard` globalmente via `APP_GUARD`.

Alternativas que consideramos: Aplicar `@UseGuards(JwtAuthGuard)` manualmente em cada endpoint protegido.

Por que escolhemos a abordagem global: Aplicar o guard globalmente reduz o risco de esquecer autenticação em endpoints novos. Assim, todos os endpoints ficam protegidos por padrão e apenas rotas explicitamente marcadas com `@Public()` escapam da autenticação.

O que isso muda no sistema: Endpoints como `/auth/login` e `/auth/refresh` utilizam `@Public()`, enquanto o restante da API exige autenticação automaticamente.

---

### Campos do Payload JWT

Decisão: O payload JWT contém apenas:
- `sub`
- `email`
- `type`

Por que escolhemos esses campos: O `sub` identifica o usuário autenticado de forma padronizada. O `email` facilita logs e auditoria. O `type` permite que o `RolesGuard` aplique autorização baseada em perfil sem precisar consultar o banco a cada requisição.

Campos excluídos: Não incluímos informações sensíveis como senha, CPF, CRM, refresh token ou dados pessoais porque o payload JWT pode ser decodificado pelo cliente.

---

### Estratégia de armazenamento do Refresh Token

Decisão: O refresh token não é salvo em texto puro no banco. Antes de persistir, aplicamos `bcrypt.hash`.

Alternativas que consideramos: Armazenar o refresh token diretamente em texto puro.

Por que escolhemos hash bcrypt: Caso o banco seja comprometido, um refresh token em texto puro permitiria que o atacante renovasse sessões indefinidamente. Com hash bcrypt, o token não pode ser reutilizado diretamente mesmo após vazamento do banco.

O que isso muda no sistema: O refresh token é validado utilizando `bcrypt.compare`, seguindo o mesmo princípio de segurança utilizado para senhas.

---

### Tempo de Expiração dos Tokens

Decisão:
- `accessToken`: 15 minutos
- `refreshToken`: 7 dias

Por que escolhemos esses valores: O access token possui tempo curto para reduzir a janela de risco caso seja interceptado. Já o refresh token possui duração maior para melhorar a experiência do usuário sem exigir login frequente.

Contexto clínico: Em um sistema médico, sessões muito longas aumentariam o risco de acesso indevido em computadores compartilhados, enquanto sessões muito curtas prejudicariam o fluxo operacional dos usuários.

---

### Controle por Perfil e Controle por Recurso

Decisão: Separamos controle de perfil e controle de recurso em camadas diferentes.

Como funciona:
- O `RolesGuard` valida se o usuário possui o perfil correto.
- Os services validam ownership e regras de recurso.

Exemplo:
- Um `PATIENT` autenticado pode acessar `/patients/:id`, mas o service garante que ele só consiga acessar o próprio recurso.
- Um `DOCTOR` pode acessar endpoints de agendamento, mas apenas os próprios agendamentos.

Por que escolhemos essa separação: Isso mantém a autorização mais organizada e evita misturar regras de negócio complexas dentro dos controllers.

---

### Política de 401 e 403

Decisão:
- `401 Unauthorized` é retornado quando o usuário não possui autenticação válida.
- `403 Forbidden` é retornado quando o usuário está autenticado, mas não possui permissão suficiente.

Por que escolhemos essa diferenciação: Isso permite que o frontend identifique corretamente se o problema é ausência de login ou falta de privilégios.

O Exception Filter foi expandido para padronizar ambos os erros no formato RFC 7807.

---

### Superfícies de Ataque Identificadas

As principais superfícies de ataque identificadas foram:

- endpoint de login sujeito a tentativa de força bruta;
- reutilização de refresh token;
- tentativa de acesso a recursos alterando IDs na URL;
- vazamento de informações sensíveis via serialização incorreta.

Para mitigar esses riscos:
- utilizamos JWT com expiração curta;
- implementamos refresh token rotation;
- armazenamos refresh token com hash bcrypt;
- utilizamos guards globais;
- aplicamos controle de ownership nos services;
- utilizamos serialização com `@Exclude()` e `@Expose()`.

Ao detectar a reutilização de um refresh token antigo, o sistema invalida o refresh token atual do usuário. Essa decisão foi adotada por segurança, pois a reutilização pode indicar vazamento ou tentativa de uso indevido do token. Forçando o usuário a logar novamente, seguindo esse fluxo:

refresh antigo reutilizado → sistema invalida sessão → usuário precisa logar de novo

---

1. Single Table Inheritance (STI) para a hierarquia de Usuários

Decisão: Optamos por usar STI com uma tabela única chamada users e uma coluna type para diferenciar os três tipos de usuário: ADMIN, DOCTOR e PATIENT.

Alternativas que consideramos: A principal alternativa seria o Class Table Inheritance (CTI), onde cada tipo teria sua própria tabela (admins, doctors, patients) com chave estrangeira apontando para a tabela base users.

Por que escolhemos STI: Os três perfis compartilham praticamente os mesmos atributos (name, email, password, isActive, createdAt). Se usássemos CTI, qualquer consulta que misturasse tipos diferentes precisaria de JOINs entre três tabelas, o que tornaria o código bem mais complicado sem necessidade.

O que isso muda no sistema: Todas as queries de usuário batem em uma única tabela, o que simplifica bastante o código dos services.

---

2. Single Table Inheritance (STI) para a hierarquia de Agendamentos

Decisão: Utilizamos STI com a tabela schedules e coluna type para as modalidades IN_PERSON, ONLINE e HOME.

Por que escolhemos STI: Isso permite consultas polimórficas simples e mantém o código mais organizado utilizando `@ChildEntity`.

---

4. Formato de Erros seguindo RFC 7807

Decisão: Todos os erros retornam um objeto padronizado com:
- type
- title
- status
- detail
- instance
- method
- timestamp

Por que escolhemos RFC 7807: O padrão facilita integração, depuração e tratamento programático dos erros no frontend.

---

5. Validação declarativa com ValidationPipe e class-validator

Decisão: Configuramos:
- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Por que escolhemos isso: Os DTOs centralizam as regras de validação e impedem que campos inesperados cheguem aos services.

---

6. Serialização com ClassSerializerInterceptor

Decisão: Utilizamos DTOs de resposta com:
- `@Exclude()`
- `@Expose()`

Por que escolhemos isso: Isso evita vazamento de:
- password
- refreshToken
- refreshTokenJti
- campos internos

---

7. Logs em Casos de Exceção

Validamos que o `LoggingMiddleware` continua registrando corretamente mesmo quando ocorre exceção, pois o middleware monitora o evento `finish` da resposta.

---

8. Refresh Token Rotation

Decisão: Cada refresh token pode ser utilizado apenas uma vez.

Por que escolhemos isso: Caso um refresh token seja interceptado e reutilizado, o sistema invalida a sessão anterior e impede replay attack.

---

9. Controle de Conflito em Agendamentos

Decisão: Implementamos proteção dupla:
- validação no service;
- índice único parcial no banco.

Por que escolhemos isso: Isso evita double booking inclusive em cenários concorrentes.

---

10. Política de Comentários e Clean Code

Decisão: Priorizamos nomes de métodos expressivos e comentários apenas para explicar decisões de negócio não óbvias.

---

11. Ordem das Verificações (Early Return)

Decisão: Validamos primeiro existência de entidade (`404`) antes de regras complexas (`409`).

Por que escolhemos isso: Segue o princípio de falhar rápido e economiza processamento.

---

-> Tabela de Controle de Acesso por Recurso

| Método | Endpoint | ADMIN | DOCTOR | PATIENT | Restrição |
|--------|-----------|:-----:|:------:|:-------:|-----------|
| POST | /auth/login | ✓ | ✓ | ✓ | Público |
| POST | /auth/refresh | ✓ | ✓ | ✓ | Público |
| POST | /auth/logout | ✓ | ✓ | ✓ | Invalida apenas o próprio token |
| GET | /auth/me | ✓ | ✓ | ✓ | Retorna apenas o usuário autenticado |
| POST | /users | ✓ | ✗ | ✗ | Administrativo |
| GET | /users | ✓ | ✗ | ✗ | Administrativo |
| GET | /users/:id | ✓ | ✓ | ✓ | Próprio recurso |
| PUT | /users/:id | ✓ | ✓ | ✓ | Próprio recurso |
| DELETE | /users/:id | ✓ | ✗ | ✗ | Administrativo |
| GET | /doctors | ✓ | ✓ | ✓ | Nenhuma |
| GET | /doctors/:id | ✓ | ✓ | ✓ | Nenhuma |
| GET | /patients | ✓ | ✓ | ✗ | Nenhuma |
| GET | /patients/:id | ✓ | ✓ | ✓ | Próprio recurso |
| POST | /schedules | ✓ | ✗ | ✓ | Patient cria apenas para si |
| GET | /schedules | ✓ | ✓ | ✓ | Ownership validado no service |
| GET | /schedules/:id | ✓ | ✓ | ✓ | Ownership validado no service |
| PATCH | /schedules/:id/status | ✓ | ✓ | ✓ | Ownership validado no service |
| DELETE | /schedules/:id | ✓ | ✗ | ✗ | Administrativo |

4> Dificuldades e aprendizados

Durante o desenvolvimento do projeto, uma das principais dificuldades foi entender a linguagem, desde a estrutura até as funções que a própria linguagem e biblioteca fornecem.

Mesmo tendo assistido às aulas práticas, quando realmente começamos a desenvolver surgiram várias dificuldades, principalmente por ser muita coisa nova para aprender ao mesmo tempo.

A separação e estrutura do código também foi uma dificuldade, principalmente no começo, quando ainda não tínhamos entendido muito bem como organizar o projeto.

Com conversas entre o grupo, pesquisas e dúvidas tiradas com o professor, conseguimos reorganizar e estruturar melhor o projeto.

Entender o funcionamento do Swagger também foi uma dificuldade no início, principalmente na utilização correta dos decorators e documentação dos endpoints.

A decisão entre inativar ou deletar um usuário também foi bastante discutida entre o grupo. Após analisarmos o impacto nos registros e integridade do sistema, optamos pela inativação lógica utilizando `isActive = false`.

Encontramos algumas dificuldades para entender e implementar o fluxo de autenticação.

Tivemos alguns problemas no refresh token, onde era possivel usar um antigo.

E também o funcionamento do app_guard e estrategia global de autenticação.