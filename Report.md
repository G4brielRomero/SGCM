# Relatório Técnico — SGCM

## Sistema de Gestão de Clínica Médica

**Disciplina:** Desenvolvimento Web 2  
**Entrega:** Etapa 1  
**Integrantes:** Gabriel, Murilo, João  
**Data:** Maio de 2026

1> Integrantes e contribuições

Participação de todos: Desenvolvimento inicial com estruturação, entidades,
controllers, service, module, dto, filtros, relatório e testes.

Gabriel Romero: Correção de incoerências na atualização dos CPFS, criação do problemDetailDto para as respostas de erro, testes de caso em maneira geral.

Murilo José Silva: Adicionando comentários para melhor entendimento, correção de conflito em agendamento, validações de dto, serialização e testes.

João Pedro Martin Turina: Testes e correções de funcionamento das requisições e endpoints, adição de decorator

3> Decisões Técnicas

1. Single Table Inheritance (STI) para a hierarquia de Usuários
   Decisão: Optamos por usar STI com uma tabela única chamada users e uma coluna type para diferenciar os três tipos de usuário: ADMIN, DOCTOR e PATIENT.
   Alternativas que consideramos: A principal alternativa seria o Class Table Inheritance (CTI), onde cada tipo teria sua própria tabela (admins, doctors, patients) com chave estrangeira apontando para a tabela base users.
   Por que escolhemos STI: Os três perfis compartilham praticamente os mesmos atributos (name, email, password, isActive, createdAt). Se usássemos CTI, qualquer consulta que misturasse tipos diferentes precisaria de JOINs entre três tabelas, o que tornaria o código bem mais complicado sem necessidade. Fora isso, o SQLite tem suporte limitado à cláusula RETURNING, o que já nos deu dor de cabeça em testes e tornaria o CTI ainda mais problemático com o TypeORM. As poucas colunas específicas de cada tipo (crm pro médico, cpf e birthDate pro paciente) ficam nulas nos demais — o que não chega a ser um problema, dado que são poucos campos.
   O que isso muda no sistema: Todas as queries de usuário batem em uma única tabela, o que simplifica bastante o código dos services. O TypeORM já cuida da discriminação pelo campo type automaticamente, e as entidades Doctor, Patient e Admin são tratadas como subclasses com @ChildEntity.

2. Single Table Inheritance (STI) para a hierarquia de Agendamentos
   Decisão: Mesma ideia da hierarquia de usuários: STI com a tabela schedules e coluna type para as três modalidades — IN_PERSON, ONLINE e HOME.
   Alternativas que consideramos: Uma tabela única sem herança formal, usando colunas nullable para todos os campos específicos de cada modalidade, sem criar entidades distintas no código.
   Por que escolhemos STI: Usar @ChildEntity formalmente deixa o código muito mais claro — quando você instancia um InPersonSchedule, fica explícito que room e unit são campos obrigatórios para aquela modalidade. Além disso, consultas do tipo "todos os agendamentos de um médico, independente do tipo" funcionam direto na entidade base Schedule, sem precisar de UNION. O problema de compatibilidade com o SQLite que mencionamos nos usuários também se aplica aqui.
   O que isso muda no sistema: Na hora de salvar, o service instancia a entidade certa dependendo da modalidade (InPersonSchedule, OnlineSchedule ou HomeSchedule). Já nas consultas de listagem ou busca por ID, a gente opera direto no repositório base Schedule, que retorna qualquer modalidade de forma transparente.

3. Soft Delete para inativação de Usuários
   Decisão: Usuários não são deletados de verdade do banco. Quando chamamos DELETE /users/:id, o sistema apenas seta isActive = false no registro.
   Alternativas que consideramos: Deletar de fato com DELETE no SQL, possivelmente arquivando o registro em outra tabela antes de remover.
   Por que escolhemos soft delete: Usuários aparecem referenciados em agendamentos históricos. Se a gente deletasse fisicamente, quebraria a integridade referencial e destruiria o histórico clínico — o que é completamente inaceitável num sistema médico. Com soft delete, o histórico continua intacto, os registros inativos simplesmente não aparecem nas listagens (WHERE isActive = true), e reativar uma conta seria trivial. Também adicionamos uma verificação: não é possível inativar um usuário que tenha agendamentos com status PENDING ou CONFIRMED, para não deixar o sistema em estado inconsistente.
   O que isso muda no sistema: Todas as queries de busca incluem o filtro isActive = true. A operação de remoção checa se existem agendamentos ativos antes de inativar e, se existirem, retorna 409 Conflict com a quantidade de agendamentos pendentes.

4. Formato de Erros seguindo RFC 7807
   Decisão: Todos os erros da API retornam um objeto padronizado com os campos type, title, status, detail, instance, method e timestamp.
   Alternativas que consideramos: Manter o formato padrão do NestJS ({ message, statusCode, error }), que já vem configurado automaticamente sem precisar mexer em nada.
   Por que escolhemos RFC 7807: O RFC 7807 é um padrão bem estabelecido para APIs HTTP que torna os erros legíveis tanto pra humanos quanto para código. O campo type funciona como um identificador único por categoria de erro, permitindo que o cliente trate erros programaticamente. O detail traz a mensagem específica da ocorrência (por exemplo: "Médico com id 15 não foi encontrado."), enquanto instance mostra exatamente qual URL gerou o problema. Essa uniformidade facilita muito o consumo da API e a depuração.
   O que isso muda no sistema: Implementamos um HttpExceptionFilter global com @Catch() que intercepta qualquer exceção — tanto as lançadas intencionalmente pelos services (NotFoundException, ConflictException, BadRequestException) quanto erros inesperados, que retornam 500 com mensagem genérica sem expor detalhes internos.

5. Validação declarativa com ValidationPipe e class-validator
   Decisão: Configurar o ValidationPipe globalmente com whitelist: true, forbidNonWhitelisted: true e transform: true. As regras de validação ficam declaradas nos DTOs via decorators do class-validator.
   Alternativas que consideramos: Fazer a validação de forma imperativa nos services, verificando campo a campo manualmente antes de salvar.
   Por que escolhemos a abordagem declarativa: Validação via decorators mantém as regras junto aos dados (no DTO), o que torna o código mais fácil de ler e manter. O whitelist: true remove campos não declarados antes de chegar ao service, e o forbidNonWhitelisted: true rejeita requisições com campos desconhecidos com 400 Bad Request, o que protege contra envio de dados inesperados. Campos condicionalmente obrigatórios — como crm, que só faz sentido para médicos — foram tratados com @ValidateIf, evitando lógica condicional espalhada pelo service.
   O que isso muda no sistema: Os services já recebem os dados validados e com os tipos corretos (transform: true converte, por exemplo, strings de query param para number automaticamente). As mensagens de erro de validação são coletadas em array e concatenadas no campo detail da resposta RFC 7807.

6. Serialização de respostas com ClassSerializerInterceptor
   Decisão: Configurar o ClassSerializerInterceptor globalmente, com DTOs de resposta que usam @Exclude() na classe e @Expose() apenas nos campos que devem aparecer. Os controllers usam plainToInstance para converter a entidade no DTO correto antes de retornar.
   Alternativas que consideramos: Deletar manualmente os campos sensíveis das entidades antes de retornar, ou simplesmente retornar as entidades do TypeORM direto.
   Por que escolhemos o ClassSerializerInterceptor: Retornar entidades diretamente exporia campos como password e outros campos internos do TypeORM. Deletar manualmente seria frágil — qualquer novo campo adicionado à entidade precisaria ser explicitamente removido em todos os pontos de retorno. Com @Exclude() no DTO e @Expose() só nos campos desejados, o contrato de resposta é declarativo e não tem como vazar campo acidentalmente.
   O que isso muda no sistema: Cada recurso tem seu próprio DTO de resposta (UserResponseDto, DoctorResponseDto, PatientResponseDto, etc.). O campo password nunca aparece em nenhuma resposta da API, independente do caminho percorrido no código.

7. Prevenção de double-booking com índice parcial único
   Decisão: Além da verificação explícita no service, criamos um índice parcial único no banco em (doctorId, scheduledAt) com a cláusula WHERE status = 'CONFIRMED'.
   Alternativas que consideramos: Só fazer a verificação via query antes de salvar, sem nenhuma constraint no banco.
   Por que adicionamos o índice parcial: A verificação no service resolve o caso normal, mas não protege contra condições de corrida — duas requisições simultâneas podem passar pela verificação antes de qualquer uma terminar o INSERT. O índice parcial adiciona uma segunda camada de proteção a nível de banco, garantindo que mesmo em condição de corrida o banco rejeite a segunda inserção com erro de constraint. O índice é parcial (só para CONFIRMED) justamente para não bloquear múltiplos agendamentos PENDING no mesmo horário, o que faz sentido no fluxo do sistema.
   O que isso muda no sistema: O filtro de exceções captura o SQLITE_CONSTRAINT_UNIQUE e retorna 409 Conflict com mensagem amigável. A regra de negócio fica garantida em dois pontos independentes, tornando o sistema mais robusto a cenários de concorrência.

8. Exportação do UsersService para o SchedulesModule
   Decisão: O UsersModule exporta o UsersService integralmente. O SchedulesModule o importa e injeta no SchedulesService via construtor.

-> Reflexões Arquiteturais e Respostas aos Requisitos

1. Granularidade dos Controllers e Documentação
   Decisão: Adotamos uma abordagem híbrida. Temos o `UsersController` para operações administrativas e CRUD genérico, enquanto `DoctorsController` e `PatientsController` oferecem rotas especializadas (ex: `/doctors/:id/specialties`).
   Justificativa: Isso permite que a documentação do Swagger seja segmentada por perfil, facilitando o consumo da API. O `UsersController` lida com a criação polimórfica (recebendo o `type`), enquanto os controllers específicos retornam visões enriquecidas (como médicos com suas especialidades já carregadas), agregando valor real sobre uma consulta genérica de usuários.

2. Dependências entre Módulos e Reutilização
   Decisão: O `UsersModule` exporta o `UsersService` integralmente para o `SchedulesModule`.
   Justificativa: Embora exportar o service inteiro exponha métodos de criação/remoção, optamos pela simplicidade nesta etapa. Para garantir o encapsulamento, o `SchedulesService` utiliza apenas métodos de busca (`findDoctorOrFail`, `findPatientOrFail`). Esta interface já foi projetada para ser reutilizada pelo `AppointmentsModule` na Etapa 3.

3. DTOs Únicos com Validação Condicional
   Decisão: Utilizamos um único `CreateScheduleDto` e `CreateUserDto` fazendo uso massivo de `@ValidateIf` do `class-validator`.
   Justificativa: Optamos por essa estratégia para manter os endpoints de criação centralizados e simplificar o roteamento no NestJS. No `CreateScheduleDto`, campos como `accessLink` só são validados se o `type` for `ONLINE`. No Swagger, usamos `@ApiPropertyOptional` para indicar que esses campos dependem da modalidade escolhida, mantendo o contrato claro sem precisar de múltiplos endpoints de POST.

4. Validação de CPF e Invariantes
   Decisão: Implementamos um decorator customizado `@IsCpf` que valida o algoritmo completo do dígito verificador.
   Justificativa: Apenas validar o formato (regex) seria insuficiente para um sistema médico onde a unicidade e veracidade do documento são críticas. As invariantes de negócio são verificadas em duas camadas: no DTO (formato e presença) e no Service (regras de domínio, como impedir agendamentos no passado ou duplicados), garantindo que o sistema seja "seguro por padrão".

5. Erros de Validação e RFC 7807
   Decisão: No `HttpExceptionFilter`, interceptamos o array de erros do `ValidationPipe`.
   Justificativa: O padrão RFC 7807 exige um campo `detail` em string. Nossa estratégia concatena as mensagens de erro (ex: "CRM é obrigatório; E-mail inválido") em uma única string separada por ponto e vírgula. Isso mantém a compatibilidade com o padrão sem perder a informação de múltiplos erros de entrada.

6. Unicidade: Service vs Banco de Dados
   Decisão: Verificação dupla. O Service faz um `findOne` antes de salvar para retornar um erro 409 amigável, e o Banco possui índices únicos (parciais para agendamentos) como última linha de defesa.
   Justificativa: O Service provê a melhor experiência para o desenvolvedor frontend com mensagens claras. O índice no banco (STI com `WHERE status = 'CONFIRMED'`) previne *race conditions* que a checagem em memória/service não conseguiria barrar em ambientes de alta concorrência.

7. Atualização Parcial e Regras de Negócio
   Decisão: O `UpdateUserDto` e `UpdateScheduleDto` são parciais, mas bloqueiam a alteração do campo `type`.
   Justificativa: No domínio clínico, um Paciente não "evolui" para Médico no mesmo registro; são identidades distintas. A senha pode ser atualizada via `PUT`, mas a lógica de hash (bcrypt com custo 12) é garantida no Service. O custo 12 foi escolhido por ser o padrão de mercado que equilibra segurança contra força bruta e tempo de resposta do servidor.

8. Entidade de Junção e Evolução (Doctor x Specialty)
   Decisão: Nesta etapa, utilizamos a facilidade do TypeORM para gerenciar a tabela de junção.
   Justificativa: Embora o diagrama preveja uma entidade explícita, a implementação atual atende aos requisitos de associar/desassociar. Para a Etapa 3, se houver necessidade de adicionar atributos à relação (como "data de obtenção do título"), evoluiremos para uma entidade de junção explícita.

9. Ordenação Padrão
   Decisão: Agendamentos são ordenados por `scheduledAt: ASC` (mais próximos primeiro). Usuários são ordenados por `name: ASC`.
   Justificativa: Estabelecemos essa consistência no `PaginationQueryDto` e nos serviços para que as listagens sejam previsíveis para o usuário final, mesmo quando o parâmetro `sort` for omitido.

10. Limitações do Modelo: Múltiplos Perfis
    Reflexão: O modelo atual via STI com coluna `type` limita um usuário a ter apenas um papel. Se um Médico fosse também Administrador, precisaríamos migrar de STI para uma abordagem de "Roles" (Many-to-Many) ou permitir múltiplos registros com o mesmo e-mail (o que quebraria a unicidade atual). Reconhecemos essa limitação como uma simplificação de escopo para a Etapa 1.

11. Gestão de Schema: Synchronize vs Migrations
    Decisão: Para esta etapa de desenvolvimento, utilizamos `synchronize: true` no SQLite.
    Justificativa: Como a equipe é pequena e o schema está mudando rapidamente na Etapa 1, o `synchronize` acelera o desenvolvimento. Para a Etapa 2 (Autenticação) e Etapa 3 (Produção), migraremos para arquivos de Migration para garantir rastreabilidade e evitar perda de dados.

12. Cancelamento e Auditoria Prematura
    Decisão: O campo `cancelledBy` foi incluído nas entidades, mas permanece nulo nesta etapa.
    Justificativa: Sem o contexto de `@CurrentUser()`, não seria seguro preencher este campo. Na Etapa 2, o `SchedulesService` será atualizado para injetar o ID do usuário logado durante a operação de cancelamento, permitindo auditoria completa de quem desmarcou a consulta.

13. Política de Comentários e Clean Code
    Decisão: Priorizamos nomes de métodos expressivos (ex: `findDoctorOrFail`).
    Justificativa: Comentários foram reservados apenas para explicar "o porquê" de decisões de negócio não óbvias (como a lógica do índice parcial único). A documentação técnica principal reside nos decorators do Swagger, que servem tanto para o código quanto para a interface de testes da API.

14. Atomicidade das Operações
    Reflexão: No SQLite, operações simples de uma única tabela são atômicas por padrão. Contudo, na Etapa 3, ao converter um `Schedule` para `Appointment`, usaremos `DataSource.transaction()` para garantir que o agendamento mude para `COMPLETED` apenas se o atendimento for gravado com sucesso, evitando estados inconsistentes no sistema.

15. Ordem das Verificações (Early Return)
    Decisão: Validamos primeiro a existência das entidades (`404 Not Found`) antes de validar regras de negócio complexas como conflitos de horário (`409 Conflict`).
    Justificativa: Isso economiza processamento e segue o princípio de "falhar rápido" com o erro mais óbvio primeiro.

-> Implementação de Interceptors e Padronização de Respostas

1. Detecção de Respostas de Listagem
   Decisão: O `TransformInterceptor` verifica a presença simultânea das chaves `data` e `meta` no objeto retornado pelo handler.
   Justificativa: Esta abordagem é a mais flexível pois não exige a criação de classes de wrapper adicionais ou o uso de decorators em cada método do controller. Ela reaproveita a estrutura de paginação já implementada na Etapa 1, apenas enriquecendo o objeto `meta` existente. Para a Etapa 3, essa solução escala bem, pois qualquer novo endpoint que siga o padrão de paginação será automaticamente reconhecido e formatado corretamente pelo interceptor.

2. Ordem de Execução e Serialização
   Decisão: Registramos o `ClassSerializerInterceptor` antes do `TransformInterceptor` no `main.ts`.
   Reflexão Técnica: No NestJS, interceptores globais funcionam como uma pilha (LIFO no pós-handler). Ao registrar o `ClassSerializerInterceptor` primeiro, ele se torna a "casca externa". O `TransformInterceptor` envolve os dados no envelope `{ data, meta }`, e então o `ClassSerializerInterceptor` processa esse objeto final. 
   Resultado do Teste: Em testes com o endpoint de usuários, o campo `password` (marcado com `@Exclude`) permaneceu oculto. Isso ocorre porque o serializador do NestJS percorre o objeto de forma recursiva; mesmo que o DTO esteja dentro da chave `data`, as regras de exclusão continuam sendo aplicadas corretamente.

3. Tratamento de Respostas sem Corpo
   Decisão: O interceptor verifica o `response.statusCode` e o valor de retorno do handler.
   Justificativa: Se o status for `204` ou o dado for `null`/`undefined`, o interceptor retorna o dado original sem processamento. Isso preserva a semântica do protocolo HTTP, evitando que uma operação de deleção bem-sucedida (que não deve retornar corpo) acabe enviando um objeto de metadados acidentalmente.

4. Registro de Logs em Cenários de Exceção
   Reflexão sobre Logging: O `LoggingMiddleware` captura o evento `finish` do objeto de resposta. 
   Conclusão dos Testes: Mesmo quando uma exceção ocorre (ex: 404 Not Found) e é capturada pelo `HttpExceptionFilter`, o ciclo de vida da requisição HTTP é finalizado pelo Express enviando a resposta de erro. O middleware de log continua funcionando corretamente, registrando o tempo total de processamento, pois ele não depende do sucesso do handler, mas sim do encerramento da resposta no socket.

5. Expansão do Exception Filter para Segurança
   Revisão: Atualizamos o `HttpExceptionFilter` para tratar explicitamente `UnauthorizedException` (401) e `ForbiddenException` (403).
   Justificativa: Com a introdução da autenticação, erros de "Token Inválido" ou "Acesso Negado por Perfil" tornam-se comuns. O filtro agora fornece mensagens claras seguindo o RFC 7807, garantindo que o frontend possa diferenciar um erro de login de um erro de permissão administrativa de forma programática através do campo `type`.


4> Dificuldades e aprendizados

Durante o desenvolvimento do projeto, uma das principais dificuldades foi entender a linguagem, desde a estrutura até as funções que a própria linguagem e biblioteca fornecem. Mesmo tendo assistido às aulas práticas, quando realmente começamos a desenvolver surgiram várias dificuldades, principalmente por ser muita coisa novapara aprender ao mesmo tempo.
A separação e estrutura do código também foi uma dificuldade, principalmente no começo, quando ainda não tínhamos entendido muito bem como organizar o projeto. Ficamos em dúvida se deixávamos tudo em uma pasta só ou se fazíamos a separação correta por módulos, controllers, services e DTOs. Com conversas entre o grupo, pesquisas e dúvidas tiradas com o professor, conseguimos reorganizar e estruturar melhor o projeto. Entender o funcionamento do Swagger na aplicação também foi uma dificuldade. Apesar de o NestJS já possuir integração com o Swagger, utilizar os decorators corretamente e entender como documentar os endpoints acabou sendo uma dificuldade no início. Com testes e prática, conseguimos compreender melhor como ele funciona.
A decisão entre inativar ou deletar um usuário também foi bastante discutida entre o grupo, pois tínhamos dúvidas sobre qual seria a melhor abordagem no momento da implementação. Após conversarmos, decidimos optar pela inativação para preservar os registros e manter a integridade das informações do sistema.