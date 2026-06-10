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

João Pedro Martin Turina: Testes e correções de funcionamento das requisições e endpoints, adição de decorators, implementação de Transform Interceptor e Exception Filter. Produção do relatório etapa 3 

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

Optamos por registrar tanto o JwtAuthGuard quanto o RolesGuard globalmente como APP_GUARD no módulo AuthModule (src/modules/auth/auth.module.ts), não em main.ts. Ambos os guards são declarados como providers com a chave especial APP_GUARD do NestJS Core, o que os aplica automaticamente em toda a aplicação antes de qualquer controller ser atingido.

Os decorators relacionados (@Public(), @Roles(), @CurrentUser()) ficam em src/modules/auth/decorators/ e são consumidos pelos guards via Reflector para controle fino por endpoint.

Alternativas consideradas

Aplicar @UseGuards(JwtAuthGuard, RolesGuard) manualmente em cada controller ou endpoint protegido.

Por que escolhemos a abordagem global

Registrar os guards globalmente via APP_GUARD reduz o risco de esquecer autenticação em endpoints novos. Todos os endpoints ficam protegidos por padrão — apenas rotas explicitamente marcadas com @Public() escapam da autenticação JWT, e apenas rotas com @Roles() recebem verificação de perfil.

O RolesGuard depende do usuário autenticado já estar presente em request.user. Como o JwtAuthGuard é registrado primeiro no array de providers, o payload JWT já está disponível quando o RolesGuard executa — garantindo a ordem correta de execução.

O que isso muda no sistema

Endpoints como /auth/login e /auth/refresh utilizam @Public(), enquanto o restante da API exige autenticação automaticamente. Endpoints sem @Roles() aceitam qualquer perfil autenticado.

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

O payload JWT contém:

sub — ID do usuário (padrão JWT para subject)
email — e-mail do usuário
type — perfil (ADMIN, DOCTOR ou PATIENT)
jti — identificador único do token (UUID gerado por randomUUID())
tokenType — tipo do token: 'access' ou 'refresh'

Por que escolhemos esses campos

O sub identifica o usuário autenticado de forma padronizada. O email facilita logs e auditoria. O type permite que o RolesGuard aplique autorização baseada em perfil sem precisar consultar o banco a cada requisição.

O jti (JWT ID) é fundamental para a segurança do refresh token. Cada par de tokens emitido recebe um jti exclusivo para o refresh token. Ao armazenar o jti no banco junto com o hash do refresh token, o sistema consegue detectar tentativas de reutilização: se o token apresentado tem um jti diferente do registrado no banco, a sessão é invalidada imediatamente — proteção contra ataques de replay com tokens roubados.

O tokenType distingue explicitamente access tokens de refresh tokens no payload. Sem essa claim, a separação dependeria apenas de segredos distintos (JWT_SECRET vs JWT_REFRESH_SECRET). Com tokenType, o JwtAuthGuard rejeita refresh tokens apresentados como access tokens (e vice-versa no endpoint /auth/refresh), adicionando uma camada de defesa independente dos segredos.

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

sub — ID do usuário autenticado (usado para verificação de recurso próprio)
email — e-mail (disponível para logs e auditoria)
type — perfil (usado pelo RolesGuard e pelas verificações de acesso nos services)
jti — identificador único do token (usado na validação de refresh token)
tokenType — tipo do token ('access' ou 'refresh')

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

4.26 Política de Atualização de Prontuários (Etapa 3)
Decisão

Apenas os campos prescription e notes podem ser alterados após a criação de um prontuário. O campo diagnosis é imutável.

Campos imutáveis após criação

diagnosis: representa o diagnóstico clínico firmado no momento do encerramento do atendimento. Permitir alteração posterior comprometeria a integridade do registro clínico e poderia mascarar erros médicos.
appointmentId, doctorId, patientId: identificadores de vínculo — não fazem sentido mudar após a criação.
lastUpdatedBy: preenchido automaticamente pelo sistema com o id do usuário autenticado que realizou a última atualização. Nunca recebido do cliente.

Campos mutáveis

prescription: prescrição médica, que pode ser ajustada conforme a evolução do tratamento.
notes: observações clínicas complementares, que podem ser complementadas ao longo do acompanhamento.

Como isso é garantido no código

O UpdateMedicalRecordDto contém apenas prescription e notes. Com forbidNonWhitelisted: true no pipe global, qualquer tentativa de enviar diagnosis, appointmentId, doctorId, patientId ou lastUpdatedBy no body de atualização é rejeitada com 400 Bad Request antes de chegar ao service.

Controle por perfil e por recurso

Apenas ADMIN e DOCTOR podem atualizar prontuários (PUT /records/:id). PATIENT não possui acesso a esse endpoint.
DOCTOR só pode atualizar prontuários de seus próprios atendimentos — o service verifica record.doctorId === currentUser.sub antes de persistir qualquer alteração, retornando 403 Forbidden caso o prontuário pertença a outro médico.

4.26 Single Table Inheritance (STI) para Atendimentos (Etapa 3)
Decisão

Optamos por STI com a tabela appointments e coluna type para os três subtipos:

CONSULTATION
EXAM
FOLLOW_UP
Alternativas consideradas

A alternativa seria Class Table Inheritance (CTI), com tabelas separadas consultations, exams e follow_ups além da tabela base appointments.

Por que escolhemos STI

O perfil de consultas do domínio favorece fortemente o acesso polimórfico: listagens de atendimentos de um médico ou paciente precisam retornar os três subtipos em uma única query ordenada por data. Com CTI, essas listagens exigiriam UNION ou múltiplos JOINs, aumentando a complexidade das queries sem benefício real.

Os campos exclusivos de cada subtipo são poucos e bem delimitados:

CONSULTATION adiciona apenas reason e diagnosticHypothesis;
EXAM adiciona examType e result;
FOLLOW_UP adiciona originAppointmentId e clinicalEvolution.

A esparsidade é baixa — a maioria dos registros preenche ao menos um campo específico do subtipo — tornando os NULLs da STI aceitáveis.

A coluna type já é exigida como discriminador pelo domínio (usada em regras de negócio como "laudos só para EXAM"), eliminando qualquer overhead conceitual.

O que isso muda no sistema

Todas as queries de atendimento operam sobre uma única tabela appointments, incluindo filtros por médico, paciente, status e tipo. O TypeORM lida com a discriminação automaticamente via @ChildEntity, permitindo instanciar o subtipo correto sem lógica adicional no código.

4.27 Single Table Inheritance (STI) para Procedimentos (Etapa 3)
Decisão

Optamos por STI com a tabela procedures e coluna type para os dois subtipos:

SIMPLE
SPECIALIZED
Alternativas consideradas

A alternativa seria CTI, com tabelas simple_procedures e specialized_procedures além da tabela base procedures.

Por que escolhemos STI

O perfil de consultas dominante é a listagem de todos os procedimentos de um atendimento, independente do subtipo. Com CTI, essa query exigiria UNION entre as duas tabelas filhas, complicando tanto a implementação quanto a paginação.

O subconjunto de campos exclusivos do SPECIALIZED (requiredEquipment, complexityLevel, requiresAuthorization, authorizationStatus, authorizedBy, authorizedAt, deniedReason) permanece como NULL para registros SIMPLE, o que é aceitável dado que procedimentos SIMPLE tendem a ser maioria e a esparsidade total da tabela continua controlada.

A STI também simplifica o ciclo de autorização: a query de relatório administrativo que agrega authorizationStatus por tipo precisa filtrar apenas p.type = 'SPECIALIZED' na mesma tabela, sem JOIN adicional.

O que isso muda no sistema

Listagens por atendimento, filtros por authorizationStatus e agregações administrativas operam sobre uma única tabela procedures. O TypeORM instancia automaticamente SimpleProcedure ou SpecializedProcedure conforme o valor da coluna type, sem lógica de despacho manual nos services.

4.28 Adaptação da Infraestrutura para Novos Tipos de Resposta (Etapa 3)
Decisão

Mantivemos o TransformInterceptor e o LoggingMiddleware globais, validando e ajustando o comportamento para arquivos binários (PDF) e rotas públicas de validação.

Caso de Borda: PDF vs TransformInterceptor

O TransformInterceptor foi projetado para padronizar respostas JSON no formato { data, meta }. No endpoint de download de laudo (GET /reports/:id/pdf), optamos por injetar o objeto de resposta do Express via @Res(). Ao assumir o controle manual da resposta (res.end(buffer)), o NestJS desativa o processamento automático do valor de retorno para este endpoint. Isso garante que o interceptor não tente encapsular o buffer binário em um JSON, o que corromperia o PDF.

Logging de Arquivos

Validamos que o LoggingMiddleware registra corretamente o tempo de processamento e o status das requisições de download. Como o middleware monitora o evento finish do objeto response, ele captura com precisão o momento em que o streaming do arquivo foi concluído, independente do tipo de conteúdo (JSON ou binário).

Validação Pública

A infraestrutura de autenticação (JwtAuthGuard) já suportava a estratégia opt-out via @Public(). O endpoint /reports/validate/:code foi integrado utilizando este decorator, permitindo que a validação pública funcione sem exigir tokens, mantendo a consistência com a estratégia de segurança definida na Etapa 2.

4.29 Filtros Dinâmicos e Reutilizáveis
Decisão

Para os endpoints de listagem da Etapa 3 (procedimentos, laudos, relatórios), adotamos o uso de DTOs de Query combinados com o QueryBuilder do TypeORM nos services.

Por que escolhemos isso

Diferente das listagens simples da Etapa 1, os novos endpoints exigem combinações complexas de filtros (ex: filtrar procedimentos por tipo E status de autorização). O QueryBuilder permite construir a cláusula WHERE condicionalmente (if (dto.status) query.andWhere(...)), o que produz um código mais legível e performático do que tentar manipular objetos literais de critérios do TypeORM. Essa abordagem centraliza a lógica de filtragem no Service, mantendo o Controller limpo e focado apenas no mapeamento do DTO.

4.30 Evolução na Estratégia de DTOs de Hierarquia
Reflexão

Na Etapa 1, para a hierarquia de Schedule, utilizamos um DTO mais genérico com campos opcionais. Aprendemos que isso dificultava a documentação no Swagger, pois não ficava claro quais campos eram obrigatórios para cada modalidade (ex: HOME vs ONLINE).

Na Etapa 3, para Appointment e Procedure, evoluímos para uma estratégia de DTOs com discriminadores no Swagger (usando oneOf e discriminator). Embora no TypeScript a validação ainda dependa de decorators como @ValidateIf, a documentação agora reflete exatamente o que cada subtipo espera. Essa maturidade arquitetural melhorou a comunicação com quem consome a API e tornou a validação mais rigorosa.

4.31 Integridade de Dados Clínicos e Operações Irreversíveis
Identificação de Riscos

Identificamos que as operações de encerramento de atendimento (PATCH /appointments/:id/finish), emissão de laudo (POST /report) e revogação de laudo (PATCH /revoke) possuem alto potencial de comprometer a integridade clínica por serem irreversíveis.

Medidas de Proteção

- Validação de Estado: O sistema impede a emissão de laudos para exames que não estejam FINISHED.
- Imutabilidade: Uma vez encerrado o atendimento, campos como diagnosis em prontuários tornam-se imutáveis via DTO de atualização.
- Concorrência: Utilizamos verificações no Service para garantir que um atendimento não seja encerrado duas vezes simultaneamente.
- Procedimentos Pendentes: Decidimos que o encerramento de um atendimento não bloqueia se houver procedimentos PENDING ou DENIED. Clinicamente, um médico pode encerrar a consulta mesmo que um exame tenha sido negado pelo convênio, mas o sistema registra esse histórico como parte da evolução clínica.

4.32 Escolha da Estratégia de Herança (STI) para Atendimentos e Procedimentos
Decisão

Mantivemos a estratégia de Single Table Inheritance (STI) para Appointment e Procedure.

Justificativa Técnica

O perfil de consultas dominante é polimórfico: quase sempre buscamos "todos os atendimentos do paciente X" ou "todos os procedimentos do atendimento Y". A STI é extremamente eficiente para isso no SQLite, pois evita JOINs ou UNIONs.
No caso do FollowUp, a validação do originAppointmentId é feita no Service, garantindo que o atendimento de origem pertença ao mesmo paciente e não seja o próprio registro, retornando 400 Bad Request se a regra de negócio for violada (pois o ID existe, mas o vínculo é inválido).

4.33 Modelagem do Campo result em Exames
Decisão

O campo result é opcional no banco de dados (permitindo NULL), mas validado obrigatoriamente no Service antes da emissão de qualquer laudo.

Justificativa

Um exame pode ser criado e até encerrado enquanto o laboratório processa o resultado. Permitir o NULL no banco reflete essa realidade temporal. No entanto, o ReportsService bloqueia a geração do PDF se o result estiver vazio, garantindo que nenhum laudo oficial saia sem conteúdo técnico.

4.34 Exposição de authorizedBy (ID vs Referência)
Decisão

Em procedimentos especializados, o campo authorizedBy retorna tanto o ID quanto o nome do administrador nas respostas da API.

Por que escolhemos isso

Para o contexto clínico e auditoria, apenas o ID é insuficiente para uma leitura rápida. Realizamos um leftJoin no QueryBuilder para trazer o nome do Admin, mantendo a eficiência da consulta sem expor dados sensíveis do administrador, respeitando a serialização do UserResponseDto.

4.35 Um Schedule pode ter mais de um Appointment?
Decisão

Não. O sistema impõe uma relação 1:1 estrita. Se houver uma tentativa de criar um segundo Appointment para o mesmo scheduleId, o service lança um 409 Conflict. Caso um atendimento seja excluído (o que evitamos via 405 em registros clínicos), o agendamento voltaria a ficar disponível, mas preferimos a integridade de manter o vínculo histórico.

4.36 Reflexão Final: Padrão de Herança para Projetos Futuros

Após implementar quatro hierarquias (User, Schedule, Appointment, Procedure) com STI no TypeORM/SQLite, nossa recomendação é:

1. Use STI (Single Table) como padrão para sistemas onde a maioria das consultas é polimórfica (listagens gerais) e os subtipos não divergem massivamente em número de campos. É mais simples de manter e mais performático no SQLite.
2. Use CTI (Joined Table) apenas se os subtipos forem entidades muito distintas, com muitos campos exclusivos que causariam uma tabela esparsa demais (excesso de NULLs), ou se houver necessidade de integridade referencial estrita em nível de banco de dados para campos específicos dos subtipos.

No SGCM, a STI provou ser a escolha correta pela coesão dos dados clínicos.

4.37 Gestão de Autorização e Ciclo de Vida de Procedimentos
Decisão

O endpoint PATCH /procedures/:id/authorization utiliza um campo action com os valores AUTHORIZE ou DENY. Para negações, o campo deniedReason é obrigatório no DTO. 

Justificativa

Optamos por um único endpoint com action em vez de rotas separadas para simplificar o controle de estado no frontend. A obrigatoriedade do motivo da negação é uma regra de negócio crítica para que o médico solicitante possa ajustar a conduta clínica ou contestar a decisão administrativa. Além disso, reforçamos que procedimentos só podem ser atualizados ou removidos enquanto o atendimento está IN_PROGRESS; uma vez finalizado, o registro torna-se parte do prontuário histórico e imutável.

4.38 Prontuários: Criação, Imutabilidade e Rastreabilidade
Decisão

Os prontuários são criados manualmente pelo médico via POST /appointments/:id/records após o encerramento do atendimento.

Justificativa

Embora a criação automática garantisse a existência do registro, a criação manual permite que o médico refine a evolução clínica e a prescrição antes de gerar o documento final. Para garantir a integridade, o campo diagnosis é imutável após a criação, enquanto prescription e notes podem ser atualizados. 
Implementamos o status 405 Method Not Allowed para tentativas de DELETE /records/:id, comunicando explicitamente que registros clínicos são permanentes. A rastreabilidade é garantida pelos campos createdBy (derivado do atendimento) e lastUpdatedBy (armazenado explicitamente a cada alteração, mesmo que o editor seja o mesmo criador), assegurando uma trilha de auditoria completa.

4.39 Estratégia de Laudos: Validação Pública e Segurança do PDF
Decisão

O endpoint de validação pública retorna o status e os dados básicos do laudo. Para laudos REVOKED, retornamos explicitamente o status e o motivo da revogação, mas ocultamos o result clínico para proteger a privacidade do paciente em um endpoint sem autenticação.

Segurança e Acesso

O acesso ao PDF via GET /reports/:id/pdf exige validação de ownership: um paciente só acessa seus laudos, e um médico só acessa o que emitiu. Mesmo laudos revogados permanecem acessíveis para consulta histórica dos envolvidos, mas com uma marca d'água visual (ou aviso no cabeçalho) gerada pelo PdfService.

Roteamento

Para evitar conflitos de roteamento no NestJS, a rota estática reports/validate/:code foi declarada antes da rota parametrizada reports/:id, garantindo que a string "validate" não seja interpretada como um ID numérico.

4.40 Relatórios Administrativos e Taxa de Ocupação
Decisão

Os relatórios administrativos utilizam queries SQL via QueryBuilder com GROUP BY e COUNT, delegando o processamento pesado ao banco de dados. 

Estrutura de Resposta

As respostas são encapsuladas no envelope { data, meta }, onde data utiliza o formato de objeto com chaves dinâmicas (ex: {"PENDING": 10, "AUTHORIZED": 5}) por ser mais compacto para consumo em dashboards de resumo.

Métrica de Ocupação

Definimos a taxa de ocupação como: (CONFIRMED + COMPLETED) / (TOTAL_AGENDADOS - CANCELLED). Ignoramos cancelamentos para refletir a ocupação real do tempo que o médico dedicou ou dedicará efetivamente à clínica.

4.41 Arquitetura do PdfService e Tratamento de Falhas
Decisão

O PdfService recebe um LaudoPdfDto consolidado em vez da entidade completa.

Justificativa

Isso reduz o acoplamento entre o módulo de persistência e o de geração de documentos. Caso a biblioteca de PDF (pdfkit) falhe, o erro é capturado e mapeado para o HttpExceptionFilter, retornando um erro 500 Internal Server Error no padrão RFC 7807, ocultando detalhes técnicos da biblioteca mas informando que a geração do documento falhou. 
Atualmente, o PDF contém o validationCode em texto; a inclusão de um QR Code foi avaliada como uma melhoria futura de usabilidade, pendente da adição da biblioteca qrcode.

4.42 Organização de Pré-condições e Transações
Decisão

As validações de pré-condição (ex: atendimento é EXAM? está FINISHED?) são organizadas em métodos privados auxiliares dentro dos Services (ex: validateIssueReportPreConditions).

Transações

Identificamos que o encerramento de atendimento e a emissão de laudo são operações críticas. Utilizamos EntityManager.transaction para garantir que, se a geração do laudo falhar, o status do atendimento não seja alterado indevidamente, mantendo a consistência do estado clínico.

4.43 Retrospectiva e Evolução do Projeto
Reflexão Final

Ao longo das três etapas, a maior lição foi sobre a rigidez necessária em sistemas clínicos. Decisões da Etapa 1, como o uso de IDs simples, facilitaram o início, mas exigiram guards robustos na Etapa 3 para garantir a privacidade (Ownership).

Se recomeçássemos, adotaríamos UUIDs como chaves primárias públicas desde o início para evitar a enumeração de recursos. A política de documentação "Swagger-First" foi mantida com sucesso, e os exemplos no Swagger foram sincronizados com os dados do seed para permitir testes reais imediatos. O README.md foi revisado para incluir todas as novas variáveis de ambiente e instruções para o endpoint público de validação.

5. Tabela de Controle de Acesso por Recurso

Método	Endpoint	ADMIN	DOCTOR	PATIENT	Restrição
— Auth —
POST	/auth/login	✓	✓	✓	Público (sem autenticação)
POST	/auth/refresh	✓	✓	✓	Público (sem autenticação)
POST	/auth/logout	✓	✓	✓	Invalida apenas o próprio token
GET	/auth/me	✓	✓	✓	Retorna apenas o usuário autenticado
— Users —
POST	/users	✓	✗	✗	Apenas ADMIN
GET	/users	✓	✗	✗	Apenas ADMIN
GET	/users/:id	✓	✓	✓	DOCTOR e PATIENT acessam apenas o próprio
PATCH	/users/:id	✓	✓	✓	DOCTOR e PATIENT atualizam apenas o próprio
DELETE	/users/:id	✓	✗	✗	Inativação lógica; apenas ADMIN
— Doctors / Patients —
GET	/doctors	✓	✓	✓	Nenhuma
GET	/doctors/:id	✓	✓	✓	Nenhuma
GET	/patients	✓	✗	✗	Apenas ADMIN
GET	/patients/:id	✓	✓	✓	PATIENT acessa apenas o próprio
— Specialties —
POST	/specialties	✓	✗	✗	Apenas ADMIN
GET	/specialties	✓	✓	✓	Nenhuma
GET	/specialties/:id	✓	✓	✓	Nenhuma
PUT	/specialties/:id	✓	✗	✗	Apenas ADMIN
DELETE	/specialties/:id	✓	✗	✗	Apenas ADMIN; bloqueado se houver médicos vinculados
GET	/specialties/:id/doctors	✓	✓	✓	Nenhuma
GET	/doctors/:id/specialties	✓	✓	✓	Nenhuma
POST	/doctors/:id/specialties	✓	✗	✗	Apenas ADMIN
DELETE	/doctors/:id/specialties/:specialtyId	✓	✗	✗	Apenas ADMIN
— Schedules —
POST	/schedules	✓	✗	✓	PATIENT cria apenas para si mesmo
GET	/schedules	✓	✗	✗	Apenas ADMIN; para ver os próprios usar sub-rotas
GET	/schedules/:id	✓	✓	✓	Ownership validado no service
PATCH	/schedules/:id	✓	✗	✗	Apenas ADMIN; campo type imutável
PATCH	/schedules/:id/status	✓	✓	✓	DOCTOR: próprios; PATIENT: só cancela os próprios
DELETE	/schedules/:id	✓	✗	✗	Apenas ADMIN; bloqueado se CONFIRMED ou COMPLETED
GET	/doctors/:id/schedules	✓	✓	✗	DOCTOR acessa apenas os próprios
GET	/patients/:id/schedules	✓	✗	✓	PATIENT acessa apenas os próprios
— Appointments —
POST	/appointments	✓	✓	✗	DOCTOR cria apenas em agendamentos próprios
GET	/appointments	✓	✗	✗	Apenas ADMIN; para ver os próprios usar sub-rotas
GET	/appointments/:id	✓	✓	✓	Ownership validado no service
PUT	/appointments/:id	✓	✓	✗	Ownership; apenas atendimentos IN_PROGRESS
PATCH	/appointments/:id/finish	✓	✓	✗	Ownership; transição IN_PROGRESS → FINISHED
DELETE	/appointments/:id	✓	✗	✗	Bloqueado (405) — registros clínicos permanentes
GET	/doctors/:id/appointments	✓	✓	✗	DOCTOR acessa apenas os próprios
GET	/patients/:id/appointments	✓	✗	✓	PATIENT acessa apenas os próprios
— Procedures —
POST	/appointments/:id/procedures	✓	✓	✗	Ownership; atendimento deve estar IN_PROGRESS
GET	/appointments/:id/procedures	✓	✓	✓	Ownership validado no service
GET	/procedures/:id	✓	✓	✓	Ownership validado no service
PUT	/procedures/:id	✓	✓	✗	Ownership; atendimento deve estar IN_PROGRESS
PATCH	/procedures/:id/authorization	✓	✗	✗	Apenas ADMIN; apenas SPECIALIZED PENDING
DELETE	/procedures/:id	✓	✓	✗	Ownership; atendimento deve estar IN_PROGRESS
— Medical Records —
POST	/appointments/:id/records	✓	✓	✗	Ownership; atendimento deve estar FINISHED; 1 por atendimento
GET	/appointments/:id/records	✓	✓	✓	Ownership validado no service
GET	/records/:id	✓	✓	✓	Ownership validado no service
PUT	/records/:id	✓	✓	✗	DOCTOR só atualiza os próprios; diagnosis imutável
DELETE	/records/:id	✓	✓	✓	Bloqueado (405) — documentos clínicos permanentes
GET	/patients/:id/records	✓	✓	✓	PATIENT acessa apenas os próprios
GET	/doctors/:id/records	✓	✓	✗	DOCTOR acessa apenas os próprios
— Reports (Laudos) —
POST	/appointments/:id/report	✓	✓	✗	Ownership; apenas EXAM FINISHED com result preenchido
GET	/reports/validate/:code	✓	✓	✓	Público (sem autenticação)
GET	/reports/:id	✓	✓	✓	Ownership validado no service
GET	/reports/:id/pdf	✓	✓	✓	Ownership; retorna PDF (não passa pelo TransformInterceptor)
PATCH	/reports/:id/revoke	✓	✓	✗	Ownership; apenas laudos ACTIVE; irreversível
GET	/patients/:id/reports	✓	✓	✓	PATIENT acessa apenas os próprios
GET	/doctors/:id/reports	✓	✓	✗	DOCTOR acessa apenas os próprios
— Admin Reports —
GET	/admin/reports/schedules	✓	✗	✗	Apenas ADMIN; filtros de período opcionais
GET	/admin/reports/appointments	✓	✗	✗	Apenas ADMIN; filtros de período e médico
GET	/admin/reports/procedures	✓	✗	✗	Apenas ADMIN; filtros de período opcionais
GET	/admin/reports/doctors/:id/occupation	✓	✗	✗	Apenas ADMIN; taxa de ocupação do médico no período

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