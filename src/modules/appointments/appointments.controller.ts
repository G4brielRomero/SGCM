import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  MethodNotAllowedException,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ProblemDetailDto } from '../../common/dto/problem-detail.dto';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentResponseDto,
  CreateAppointmentDto,
  FindAppointmentsQueryDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
  ApiUnauthorizedResponse,
} from '../../common/decorators/api-responses.decorator';

// ═══════════════════════════════════════════════════════════════
// /appointments
// ═══════════════════════════════════════════════════════════════

@ApiBearerAuth('access-token')
@ApiTags('Appointments')
@ApiUnauthorizedResponse()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar atendimento a partir de agendamento confirmado',
    description:
      'ADMIN pode criar para qualquer médico. DOCTOR só pode criar para seus próprios agendamentos. ' +
      'O agendamento deve estar com status CONFIRMED.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          title: 'CONSULTATION',
          required: ['scheduleId', 'type', 'reason'],
          properties: {
            scheduleId: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['CONSULTATION'], example: 'CONSULTATION' },
            notes: { type: 'string', example: 'Paciente com dificuldade de locomoção.' },
            reason: { type: 'string', example: 'Dor de cabeça frequente há 2 semanas.' },
            diagnosticHypothesis: { type: 'string', example: 'Enxaqueca tensional.' },
          },
          example: {
            scheduleId: 1,
            type: 'CONSULTATION',
            notes: 'Paciente com dificuldade de locomoção.',
            reason: 'Dor de cabeça frequente há 2 semanas.',
            diagnosticHypothesis: 'Enxaqueca tensional.',
          },
        },
        {
          title: 'EXAM',
          required: ['scheduleId', 'type', 'examType'],
          properties: {
            scheduleId: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['EXAM'], example: 'EXAM' },
            notes: { type: 'string', example: 'Exame solicitado pelo médico assistente.' },
            examType: { type: 'string', example: 'hemograma' },
            result: { type: 'string', example: 'Eritrócitos 4,5 M/μL, leucócitos 6.500/μL — dentro dos limites normais.' },
          },
          example: {
            scheduleId: 2,
            type: 'EXAM',
            notes: 'Exame solicitado pelo médico assistente.',
            examType: 'hemograma',
          },
        },
        {
          title: 'FOLLOW_UP',
          required: ['scheduleId', 'type', 'originAppointmentId'],
          properties: {
            scheduleId: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['FOLLOW_UP'], example: 'FOLLOW_UP' },
            notes: { type: 'string', example: 'Retorno 15 dias após início do tratamento.' },
            originAppointmentId: { type: 'integer', example: 3 },
            clinicalEvolution: { type: 'string', example: 'Paciente apresentou melhora após medicação inicial.' },
          },
          example: {
            scheduleId: 5,
            type: 'FOLLOW_UP',
            notes: 'Retorno 15 dias após início do tratamento.',
            originAppointmentId: 3,
            clinicalEvolution: 'Paciente apresentou melhora após medicação inicial.',
          },
        },
      ],
      discriminator: { propertyName: 'type' },
    },
  })
  @ApiEnvelopeResponse(AppointmentResponseDto, 201, 'Atendimento criado com sucesso.')
  @ApiResponse({ status: 400, description: 'Dados inválidos, agendamento não CONFIRMED ou campos obrigatórios ausentes.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar atendimento neste agendamento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Já existe um atendimento para este agendamento.', type: ProblemDetailDto })
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.create(dto, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment, { excludeExtraneousValues: true });
  }

  @Get()
  @Roles(UserType.ADMIN)
  @ApiOperation({
    summary: 'Listar atendimentos',
    description: 'Acesso exclusivo ao ADMIN. Para ver atendimentos próprios use GET /doctors/{id}/appointments ou GET /patients/{id}/appointments.',
  })
  @ApiPaginatedResponse(AppointmentResponseDto, 'Lista paginada de atendimentos.')
  async findAll(
    @Query() query: FindAppointmentsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.appointmentsService.findAll(query, currentUser);
    return {
      ...result,
      data: result.data.map((a) =>
        plainToInstance(AppointmentResponseDto, a, { excludeExtraneousValues: true }),
      ),
    };
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Buscar atendimento por ID',
    description: 'ADMIN acessa qualquer. DOCTOR e PATIENT acessam apenas os próprios.',
  })
  @ApiEnvelopeResponse(AppointmentResponseDto, 200, 'Atendimento encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.findOne(id, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar dados do atendimento',
    description:
      'Permite atualizar atributos mutáveis de um atendimento IN_PROGRESS. ' +
      'Não é possível alterar type, scheduleId ou status diretamente.',
  })
  @ApiEnvelopeResponse(AppointmentResponseDto, 200, 'Atendimento atualizado.')
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar este atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.update(id, dto, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment, { excludeExtraneousValues: true });
  }

  @Patch(':id/finish')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Encerrar atendimento',
    description:
      'Transição IN_PROGRESS → FINISHED. Irreversível. ' +
      'Após encerrado, o prontuário pode ser criado e, para Exames, o laudo pode ser emitido.',
  })
  @ApiEnvelopeResponse(AppointmentResponseDto, 200, 'Atendimento encerrado.')
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para encerrar este atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
  async finish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const appointment = await this.appointmentsService.finish(id, currentUser);
    return plainToInstance(AppointmentResponseDto, appointment, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Excluir atendimento — operação bloqueada',
    description: 'Atendimentos são registros clínicos permanentes e não podem ser excluídos em nenhuma circunstância.',
  })
  @ApiResponse({ status: 405, description: 'Atendimentos não podem ser excluídos.', type: ProblemDetailDto })
  remove() {
    throw new MethodNotAllowedException('Atendimentos são registros clínicos permanentes e não podem ser excluídos.');
  }
}

// ═══════════════════════════════════════════════════════════════
// /doctors/:doctorId/appointments
// ═══════════════════════════════════════════════════════════════

@ApiBearerAuth('access-token')
@ApiTags('Doctors')
@ApiUnauthorizedResponse()
@Controller('doctors/:doctorId/appointments')
export class DoctorAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiParam({ name: 'doctorId', example: 1 })
  @ApiOperation({
    summary: 'Listar atendimentos de um médico',
    description: 'ADMIN pode listar qualquer médico. DOCTOR só lista os próprios.',
  })
  @ApiPaginatedResponse(AppointmentResponseDto, 'Lista paginada de atendimentos do médico.')
  @ApiResponse({ status: 403, description: 'Sem permissão.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  async findAll(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query() query: FindAppointmentsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.appointmentsService.findByDoctor(doctorId, query, currentUser);
    return {
      ...result,
      data: result.data.map((a) =>
        plainToInstance(AppointmentResponseDto, a, { excludeExtraneousValues: true }),
      ),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// /patients/:patientId/appointments
// ═══════════════════════════════════════════════════════════════

@ApiBearerAuth('access-token')
@ApiTags('Patients')
@ApiUnauthorizedResponse()
@Controller('patients/:patientId/appointments')
export class PatientAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.PATIENT)
  @ApiParam({ name: 'patientId', example: 2 })
  @ApiOperation({
    summary: 'Listar atendimentos de um paciente',
    description: 'ADMIN pode listar qualquer paciente. PATIENT só lista os próprios.',
  })
  @ApiPaginatedResponse(AppointmentResponseDto, 'Lista paginada de atendimentos do paciente.')
  @ApiResponse({ status: 403, description: 'Sem permissão.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.', type: ProblemDetailDto })
  async findAll(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: FindAppointmentsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.appointmentsService.findByPatient(patientId, query, currentUser);
    return {
      ...result,
      data: result.data.map((a) =>
        plainToInstance(AppointmentResponseDto, a, { excludeExtraneousValues: true }),
      ),
    };
  }
}
