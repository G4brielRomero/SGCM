Relatório Técnico — SGCM
Sistema de Gestão de Clínica Médica

Disciplina: Desenvolvimento Web 2
Entrega: Etapa 2
Integrantes: Gabriel, Murilo, João
Data: Maio de 2026

1. Integrantes e contribuições

Participação de todos: Desenvolvimento inicial com estruturação, entidades, controllers, service, module, dto, filtros, relatório e testes. Implementações principais, como por exemplo auth, interception, middleware e etc.

Gabriel Romero: Criação e implementação do middleware de logging, remoção de alguns intens que estavam duplicados, testes e correções de funcionamento das requisições e endpoints.

Murilo José Silva: Adicionando comentários para melhor entendimento, correção de conflito em agendamento, validações de dto, serialização e testes. Contribuição/implementação na parte de autenticação. Fix de token e refresh token que estava sendo possivel usar mesmo depois de solicitar um novo token. Atualização parcial do diagrama.

João Pedro Martin Turina: Testes e correções de funcionamento das requisições e endpoints, adição de decorators, implementação de Transform Interceptor e Exception Filter.

2. Diagrama de classes

O diagrama de classes da Etapa 1 permanece válido estruturalmente.

As alterações desta etapa concentraram-se principalmente na infraestrutura transversal da aplicação e no sistema de autenticação/autorização com JWT, sem mudanças relevantes na hierarquia principal das entidades.

As principais alterações desta etapa foram:

inclusão de campos relacionados ao refresh token;
auditoria de usuário autenticado em agendamentos;
guards globais;
middleware de logging;
interceptor global;
exception filter expandido para autenticação e autorização.
3. Fluxo de execução da requisição

Durante o desenvolvimento da Etapa 2, foi necessário entender melhor o funcionamento interno do NestJS e a ordem de execução dos componentes durante uma requisição autenticada.

O fluxo da aplicação ficou organizado da seguinte forma:

O LoggingMiddleware registra o início da requisição;
O JwtAuthGuard valida o token JWT;
O RolesGuard valida o perfil do usuário;
O controller recebe a requisição;
O service executa as regras de negócio;
O TransformInterceptor padroniza a resposta;
O LoggingMiddleware registra status HTTP e tempo final da requisição.

Também validamos que a ordem dos guards é importante. O RolesGuard depende do usuário autenticado já estar presente em request.user, informação adicionada anteriormente pelo JwtAuthGuard.

Essa separação ajudou a manter o código mais organizado e facilitou o entendimento do fluxo da aplicação.

4. Decisões Técnicas
4.1 Estratégia de Guards
Decisão

Optamos por registrar o JwtAuthGuard globalmente via APP_GUARD.

Alternativas consideradas

Aplicar @UseGuards(JwtAuthGuard) manualmente em cada endpoint protegido.

Por que escolhemos a abordagem global

Aplicar o guard globalmente reduz o risco de esquecer autenticação em endpoints novos. Assim, todos os endpoints ficam protegidos por padrão e apenas rotas explicitamente marcadas com @Public() escapam da autenticação.

O que isso muda no sistema

Endpoints como /auth/login e /auth/refresh utilizam @Public(), enquanto o restante da API exige autenticação automaticamente.

4.2 Estratégia de endpoints públicos com @Public()
Decisão

Utilizamos uma estratégia do tipo opt-out.

Isso significa que todos os endpoints ficam protegidos por padrão através do APP_GUARD. Apenas endpoints marcados explicitamente com @Public() podem ser acessados sem autenticação.

Endpoints públicos
/auth/login
/auth/refresh
Por que escolhemos isso

Consideramos mais seguro proteger tudo automaticamente do que depender de adicionar autenticação manualmente em cada endpoint.

Dessa forma, reduzimos bastante o risco de esquecer algum endpoint exposto sem proteção, principalmente pensando nas próximas etapas do projeto.

Funcionamento

O decorator @Public() adiciona um metadado lido pelo JwtAuthGuard através do Reflector. Quando o endpoint possui esse metadado, o guard ignora a validação do token.

4.3 Campos do Payload JWT
Decisão

O payload JWT contém apenas:

sub
email
type
Por que escolhemos esses campos

O sub identifica o usuário autenticado de forma padronizada. O email facilita logs e auditoria. O type permite que o RolesGuard aplique autorização baseada em perfil sem precisar consultar o banco a cada requisição.

Campos excluídos

Não incluímos informações sensíveis como senha, CPF, CRM, refresh token ou dados pessoais porque o payload JWT pode ser decodificado pelo cliente.

4.3.1 Verificação do usuário no banco a cada requisição

Durante o desenvolvimento também discutimos se a estratégia JWT deveria consultar o banco de dados em todas as requisições autenticadas para validar se o usuário ainda está ativo.

Alternativas consideradas
consultar o banco em toda requisição;
confiar apenas na validação criptográfica do JWT.
Decisão

Optamos por não consultar o banco em todas as requisições autenticadas.

Por que escolhemos isso

Consultar o banco em cada requisição aumentaria o custo de processamento e reduziria a principal vantagem do JWT, que é funcionar de forma stateless.

Também entendemos que, caso um usuário seja inativado após a emissão do token, ele ainda poderá utilizar o access token até sua expiração.

Consideramos que o tempo curto de expiração do access token reduz esse risco para um nível aceitável dentro do escopo do projeto.

4.4 Uso do decorator @CurrentUser()
Decisão

Implementamos um decorator customizado chamado @CurrentUser() para acessar o usuário autenticado diretamente nos controllers.

Por que escolhemos isso

Essa abordagem evita acessar manualmente o request.user em todos os endpoints e deixa os controllers mais limpos e organizados.

Funcionamento

O decorator retorna o payload do JWT já validado pelo JwtAuthGuard.

Os principais campos utilizados são:

sub
email
type

Optamos por retornar apenas o payload JWT ao invés do usuário completo do banco para evitar consultas desnecessárias em todas as requisições e manter melhor performance.

4.5 Estratégia de armazenamento do Refresh Token
Decisão

O refresh token não é salvo em texto puro no banco. Antes de persistir, aplicamos bcrypt.hash.

Alternativas consideradas

Armazenar o refresh token diretamente em texto puro.

Por que escolhemos hash bcrypt

Caso o banco seja comprometido, um refresh token em texto puro permitiria que o atacante renovasse sessões indefinidamente. Com hash bcrypt, o token não pode ser reutilizado diretamente mesmo após vazamento do banco.

O que isso muda no sistema

O refresh token é validado utilizando bcrypt.compare, seguindo o mesmo princípio de segurança utilizado para senhas.

4.6 Tempo de Expiração dos Tokens
Decisão
accessToken: 15 minutos
refreshToken: 7 dias
Por que escolhemos esses valores

O access token possui tempo curto para reduzir a janela de risco caso seja interceptado. Já o refresh token possui duração maior para melhorar a experiência do usuário sem exigir login frequente.

Contexto clínico

Em um sistema médico, sessões muito longas aumentariam o risco de acesso indevido em computadores compartilhados, enquanto sessões muito curtas prejudicariam o fluxo operacional dos usuários.

4.7 Controle por Perfil e Controle por Recurso
Decisão

Separamos controle de perfil e controle de recurso em camadas diferentes.

Como funciona
O RolesGuard valida se o usuário possui o perfil correto.
Os services validam ownership e regras de recurso.
Exemplo
Um PATIENT autenticado pode acessar /patients/:id, mas o service garante que ele só consiga acessar o próprio recurso.
Um DOCTOR pode acessar endpoints de agendamento, mas apenas os próprios agendamentos.
Por que escolhemos essa separação

Isso mantém a autorização mais organizada e evita misturar regras de negócio complexas dentro dos controllers.

4.7.1 Comportamento do RolesGuard sem @Roles()

Durante a implementação também foi necessário definir o comportamento do RolesGuard quando um endpoint não possui o decorator @Roles().

Decisão

Quando um endpoint não possui @Roles(), o RolesGuard permite acesso para qualquer usuário autenticado.

Por que escolhemos isso

Alguns endpoints não exigem restrição específica de perfil, apenas autenticação válida.

Com essa abordagem, o JwtAuthGuard continua protegendo o endpoint, enquanto o RolesGuard atua apenas quando existe uma restrição explícita de perfil.

Isso também reduz a necessidade de adicionar decorators desnecessários em endpoints acessíveis para múltiplos perfis autenticados.

4.8 Política de 401 e 403
Decisão
401 Unauthorized é retornado quando o usuário não possui autenticação válida.
403 Forbidden é retornado quando o usuário está autenticado, mas não possui permissão suficiente.
Por que escolhemos essa diferenciação

Isso permite que o frontend identifique corretamente se o problema é ausência de login ou falta de privilégios.

O Exception Filter foi expandido para padronizar ambos os erros no formato RFC 7807.

4.9 Estratégia do LoggingMiddleware
Decisão

Implementamos um middleware global responsável pelo registro das requisições.

Informações registradas
método HTTP;
URL;
IP;
status HTTP;
tempo de processamento.
Funcionamento

O middleware foi registrado globalmente no AppModule.

Para calcular o tempo total da requisição utilizamos o evento finish do objeto response.

Por que escolhemos essa abordagem

O middleware é executado antes dos guards e interceptors, permitindo registrar todas as requisições recebidas pela aplicação, inclusive requisições rejeitadas com 401 e 403.

Também validamos que o logging continua funcionando corretamente mesmo quando ocorre uma exceção capturada pelo ExceptionFilter.

Dados não registrados

Optamos por não registrar:

senhas;
tokens;
corpo completo da requisição;
dados clínicos sensíveis.

Essa decisão foi tomada para evitar exposição de informações sensíveis nos logs.

4.9.1 Formato do Logging
Decisão

Optamos por utilizar logs legíveis em console durante o desenvolvimento.

Exemplo de formato
[2026-05-10 10:00:00] POST /auth/login - 200 - 45ms
Por que escolhemos isso

Durante o desenvolvimento, o formato legível facilitou bastante:

depuração;
leitura rápida das requisições;
identificação de erros;
acompanhamento dos testes realizados.

Também discutimos a utilização de logs estruturados em JSON, porém consideramos que para o escopo atual do projeto o formato legível atendia melhor.

4.10 Estratégia do TransformInterceptor
Decisão

Implementamos um TransformInterceptor global para padronizar todas as respostas de sucesso da API.

Objetivo

Manter um formato consistente em todos os endpoints.

Estrutura utilizada
{
  "data": {},
  "meta": {
    "timestamp": "",
    "path": ""
  }
}
Tratamento de endpoints de listagem

Nos endpoints de listagem, o interceptor apenas complementa o objeto meta já existente com:

timestamp;
path.

Isso evita problemas como:

data dentro de data;
duplicação de metadados.
Por que escolhemos isso

Queríamos manter compatibilidade com a paginação criada na Etapa 1 sem quebrar a estrutura das respostas.

4.10.1 Identificação de respostas paginadas no TransformInterceptor

Durante o desenvolvimento do TransformInterceptor, foi necessário tratar separadamente respostas simples e respostas de listagem.

Problema encontrado

Sem validação adicional, o interceptor acabava gerando estruturas como:

{
  "data": {
    "data": [],
    "meta": {}
  }
}
Solução adotada

O interceptor verifica se a resposta já possui propriedades data e meta.

Quando essas propriedades já existem, o interceptor apenas complementa o objeto meta com:

timestamp;
path.

Sem criar um novo encapsulamento.

Por que escolhemos isso

Essa abordagem manteve compatibilidade com a estrutura de paginação criada anteriormente e evitou duplicação de metadados.

4.10.2 Relação entre TransformInterceptor e ExceptionFilter

Também validamos o comportamento entre o TransformInterceptor e o ExceptionFilter.

Funcionamento observado

Respostas de erro não passam pelo TransformInterceptor.

Quando ocorre uma exceção:

o fluxo é interrompido;
o ExceptionFilter captura o erro;
o erro é formatado diretamente no padrão RFC 7807.
Por que isso é importante

Essa separação mantém responsabilidades bem definidas:

interceptor → respostas de sucesso;
exception filter → respostas de erro.

Isso também evita inconsistências no formato das respostas da API.

4.11 Ordem dos Interceptors

Durante os testes percebemos que a ordem de registro dos interceptors influencia diretamente no resultado final da resposta.

Inicialmente utilizamos:

ClassSerializerInterceptor
TransformInterceptor

Porém, identificamos que o TransformInterceptor acabava encapsulando os dados antes da serialização final.

Após testes com entidades contendo @Exclude(), validamos o comportamento correto da serialização e ajustamos a ordem para garantir que os dados já fossem serializados antes da transformação final da resposta.

Isso foi importante para impedir vazamento de campos sensíveis como:

password;
refreshToken;
refreshTokenJti.
4.12 Tratamento de respostas sem corpo
Decisão

O TransformInterceptor ignora respostas sem conteúdo.

Exemplos
204 No Content
retornos null
retornos undefined
Por que escolhemos isso

O interceptor não deve transformar respostas vazias em objetos JSON, pois isso alteraria o significado semântico do status HTTP.

4.13 Relação entre Middleware e Interceptor

Durante o desenvolvimento percebemos diferenças importantes entre middleware e interceptor.

Middleware
executa antes da autenticação;
consegue registrar todas as requisições;
não possui acesso ao usuário autenticado.
Interceptor
executa após os guards;
possui acesso ao fluxo da resposta;
consegue transformar respostas;
não captura requisições bloqueadas antes do controller.
Decisão adotada

Optamos por:

middleware para logging global;
interceptor para padronização das respostas.
4.14 Formato de Erros seguindo RFC 7807
Decisão

Todos os erros retornam um objeto padronizado com:

type
title
status
detail
instance
method
timestamp
Por que escolhemos RFC 7807

O padrão facilita integração, depuração e tratamento programático dos erros no frontend.

4.15 Validação declarativa com ValidationPipe e class-validator
Decisão

Configuramos:

whitelist: true
forbidNonWhitelisted: true
transform: true
Por que escolhemos isso

Os DTOs centralizam as regras de validação e impedem que campos inesperados cheguem aos services.

4.16 Serialização com ClassSerializerInterceptor
Decisão

Utilizamos DTOs de resposta com:

@Exclude()
@Expose()
Por que escolhemos isso

Isso evita vazamento de:

password
refreshToken
refreshTokenJti
campos internos
4.17 Logs em Casos de Exceção

Validamos que o LoggingMiddleware continua registrando corretamente mesmo quando ocorre exceção, pois o middleware monitora o evento finish da resposta.

4.18 Refresh Token Rotation
Decisão

Cada refresh token pode ser utilizado apenas uma vez.

Por que escolhemos isso

Caso um refresh token seja interceptado e reutilizado, o sistema invalida a sessão anterior e impede replay attack.

Ao detectar reutilização de refresh token antigo, o sistema invalida a sessão atual do usuário, exigindo novo login.

Fluxo:

refresh antigo reutilizado → sistema invalida sessão → usuário precisa logar novamente

4.18.1 Reflexão sobre Logout e JWT Stateless

Durante o desenvolvimento também discutimos as limitações naturais do JWT stateless.

Limitação identificada

Mesmo após logout, um access token já emitido continua válido até sua expiração.

Isso acontece porque o servidor não mantém controle direto sobre todos os access tokens emitidos.

Reflexão sobre o contexto clínico

Consideramos cenários como:

computadores compartilhados;
perda de dispositivo;
sessões esquecidas abertas.

Por isso optamos por:

access token com curta duração;
refresh token rotation;
invalidação do refresh token no logout.

Reconhecemos que ainda existe uma pequena janela de risco até a expiração do access token, porém consideramos aceitável dentro do escopo do projeto.

4.19 Controle de Conflito em Agendamentos
Decisão

Implementamos proteção dupla:

validação no service;
índice único parcial no banco.
Por que escolhemos isso

Isso evita double booking inclusive em cenários concorrentes.

4.20 Política de Comentários e Clean Code
Decisão

Priorizamos nomes de métodos expressivos e comentários apenas para explicar decisões de negócio não óbvias.

4.21 Ordem das Verificações (Early Return)
Decisão

Validamos primeiro existência de entidade (404) antes de regras complexas (409).

Por que escolhemos isso

Segue o princípio de falhar rápido e economiza processamento.

4.22 Estrutura de Dependências do AuthModule

O AuthModule foi separado para centralizar toda a lógica de autenticação da aplicação.

Dependências utilizadas
UsersModule
JwtModule
PassportModule
ConfigModule

O UsersModule exporta apenas o necessário para autenticação, evitando acoplamento excessivo.

Também tomamos cuidado para evitar dependências cíclicas entre módulos, principalmente entre:

Auth;
Users;
Common.

A estratégia JWT ficou centralizada no AuthModule, enquanto os guards e decorators ficaram na pasta common, por serem componentes reutilizados em toda a aplicação.

4.23 Superfícies de Ataque Identificadas

As principais superfícies de ataque identificadas foram:

endpoint de login sujeito a tentativa de força bruta;
reutilização de refresh token;
tentativa de acesso a recursos alterando IDs na URL;
vazamento de informações sensíveis via serialização incorreta.
Medidas adotadas
JWT com expiração curta;
refresh token rotation;
refresh token armazenado com hash bcrypt;
guards globais;
controle de ownership nos services;
serialização com @Exclude() e @Expose().

Também reconhecemos algumas limitações naturais do JWT stateless, como:

impossibilidade de invalidar imediatamente access tokens já emitidos;
janela de risco até a expiração do token após logout.

Consideramos que o tempo curto do access token reduz esse risco para um nível aceitável dentro do escopo do projeto.

4.24 Single Table Inheritance (STI) para Usuários
Decisão

Optamos por usar STI com uma tabela única chamada users e uma coluna type para diferenciar os três tipos de usuário:

ADMIN
DOCTOR
PATIENT
Alternativas consideradas

A principal alternativa seria o Class Table Inheritance (CTI), onde cada tipo teria sua própria tabela.

Por que escolhemos STI

Os três perfis compartilham praticamente os mesmos atributos.

Se utilizássemos CTI, consultas envolvendo múltiplos tipos exigiriam JOINs adicionais, aumentando a complexidade sem necessidade.

O que isso muda no sistema

Todas as queries de usuário utilizam uma única tabela, simplificando services e consultas.

4.25 Single Table Inheritance (STI) para Agendamentos
Decisão

Utilizamos STI com a tabela schedules e coluna type para as modalidades:

IN_PERSON
ONLINE
HOME
Por que escolhemos STI

Isso permite consultas polimórficas simples e mantém o código mais organizado utilizando @ChildEntity.

5. Tabela de Controle de Acesso por Recurso
Método	Endpoint	ADMIN	DOCTOR	PATIENT	Restrição
POST	/auth/login	✓	✓	✓	Público
POST	/auth/refresh	✓	✓	✓	Público
POST	/auth/logout	✓	✓	✓	Invalida apenas o próprio token
GET	/auth/me	✓	✓	✓	Retorna apenas o usuário autenticado
POST	/users	✓	✗	✗	Administrativo
GET	/users	✓	✗	✗	Administrativo
GET	/users/:id	✓	✓	✓	Próprio recurso
PUT	/users/:id	✓	✓	✓	Próprio recurso
DELETE	/users/:id	✓	✗	✗	Administrativo
GET	/doctors	✓	✓	✓	Nenhuma
GET	/doctors/:id	✓	✓	✓	Nenhuma
GET	/patients	✓	✓	✗	Nenhuma
GET	/patients/:id	✓	✓	✓	Próprio recurso
POST	/schedules	✓	✗	✓	Patient cria apenas para si
GET	/schedules	✓	✓	✓	Ownership validado no service
GET	/schedules/:id	✓	✓	✓	Ownership validado no service
PATCH	/schedules/:id/status	✓	✓	✓	Ownership validado no service
DELETE	/schedules/:id	✓	✗	✗	Administrativo
5.1 Reflexão sobre a tabela de permissões

Durante a definição da tabela de permissões também discutimos quais informações deveriam ser acessíveis entre diferentes perfis do sistema.

Decisões adotadas
pacientes autenticados podem visualizar informações básicas de médicos;
médicos possuem acesso controlado a informações relacionadas aos próprios atendimentos e agendamentos;
administradores possuem acesso irrestrito por responsabilidade administrativa.
Controle por recurso

Nos endpoints com ownership, o controle foi implementado nos services para impedir acesso indevido apenas alterando IDs na URL.

Por que escolhemos isso

Buscamos equilibrar:

segurança;
funcionamento operacional da clínica;
separação correta entre autenticação, autorização e ownership.
6. Dificuldades e aprendizados

Durante o desenvolvimento do projeto, uma das principais dificuldades foi entender a linguagem, desde a estrutura até as funções que a própria linguagem e biblioteca fornecem.

Mesmo tendo assistido às aulas práticas, quando realmente começamos a desenvolver surgiram várias dificuldades, principalmente por ser muita coisa nova para aprender ao mesmo tempo.

A separação e estrutura do código também foi uma dificuldade, principalmente no começo, quando ainda não tínhamos entendido muito bem como organizar o projeto.

Com conversas entre o grupo, pesquisas e dúvidas tiradas com o professor, conseguimos reorganizar e estruturar melhor o projeto.

Entender o funcionamento do Swagger também foi uma dificuldade no início, principalmente na utilização correta dos decorators e documentação dos endpoints.

A decisão entre inativar ou deletar um usuário também foi bastante discutida entre o grupo. Após analisarmos o impacto nos registros e integridade do sistema, optamos pela inativação lógica utilizando isActive = false.

Encontramos dificuldades para entender e implementar corretamente o fluxo de autenticação.

Também tivemos problemas no refresh token, onde inicialmente ainda era possível reutilizar um token antigo.

Outro ponto de aprendizado importante foi entender o funcionamento do APP_GUARD, guards globais, interceptors e a ordem de execução dos componentes do NestJS durante uma requisição autenticada.

Além disso, compreender a separação correta entre middleware, guard, interceptor, controller e service foi importante para evitar acoplamento indevido entre responsabilidades.

Durante os testes também aprendemos bastante sobre serialização de respostas, principalmente no uso do ClassSerializerInterceptor, @Exclude() e @Expose() para impedir vazamento de dados sensíveis.

No início também tivemos dificuldade em entender a relação entre autenticação e autorização, principalmente no controle de acesso por recurso.

Após os testes e validações, entendemos melhor a diferença entre:

autenticar o usuário;
validar permissões;
validar ownership;
padronizar respostas;
tratar exceções corretamente.