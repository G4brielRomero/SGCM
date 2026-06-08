import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ProblemDetailDto } from '../../common/dto/problem-detail.dto';
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
  ApiUnauthorizedResponse,
} from '../../common/decorators/api-responses.decorator';
import { MedicalRecordsService } from './medical-records.service';
import {
  CreateMedicalRecordDto,
  FindMedicalRecordsQueryDto,
  MedicalRecordResponseDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';

// ─── /records ─────────────────────────────────────────────────────────────────

@ApiTags('Medical Records')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Buscar prontuário por ID',
    description: 'ADMIN acessa qualquer prontuário. DOCTOR acessa prontuários de seus próprios atendimentos. PATIENT acessa apenas os próprios.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(MedicalRecordResponseDto, 200, 'Prontuário encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este prontuário.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Prontuário não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findOne(id, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({
    summary: 'Atualizar prontuário',
    description: 'ADMIN e DOCTOR podem atualizar. Permite editar `prescription` (prescrição médica) e `notes` (observações clínicas). Prontuários não têm restrição de status para edição.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(MedicalRecordResponseDto, 200, 'Prontuário atualizado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar este prontuário.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Prontuário não encontrado.', type: ProblemDetailDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.update(id, dto, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOperation({
    summary: 'Excluir prontuário — operação bloqueada',
    description: 'Prontuários são documentos clínicos permanentes e não podem ser excluídos em nenhuma circunstância.',
  })
  @ApiResponse({ status: 405, description: 'Prontuários não podem ser excluídos.', type: ProblemDetailDto })
  remove() {
    this.medicalRecordsService.remove();
  }
}

// ─── /appointments/:appointmentId/records ────────────────────────────────────

@ApiTags('Medical Records')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('appointments/:appointmentId/records')
export class AppointmentRecordController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar prontuário para atendimento FINISHED',
    description: 'ADMIN e DOCTOR podem criar. O atendimento deve estar FINISHED — prontuários não podem ser criados para atendimentos ainda IN_PROGRESS. Cada atendimento aceita no máximo um prontuário.',
  })
  @ApiParam({ name: 'appointmentId', type: Number, example: 1 })
  @ApiEnvelopeResponse(MedicalRecordResponseDto, 201, 'Prontuário criado com sucesso.')
  @ApiResponse({ status: 400, description: 'Atendimento ainda está IN_PROGRESS.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar prontuário neste atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Já existe um prontuário para este atendimento.', type: ProblemDetailDto })
  async create(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.create(dto, appointmentId, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Buscar prontuário de um atendimento específico',
    description: 'Retorna o único prontuário vinculado ao atendimento. ADMIN acessa qualquer atendimento. DOCTOR e PATIENT acessam apenas os próprios.',
  })
  @ApiParam({ name: 'appointmentId', type: Number, example: 1 })
  @ApiEnvelopeResponse(MedicalRecordResponseDto, 200, 'Prontuário do atendimento.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este prontuário.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Prontuário ou atendimento não encontrado.', type: ProblemDetailDto })
  async findByAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findByAppointment(appointmentId, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }
}

// ─── /patients/:patientId/records ─────────────────────────────────────────────

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('patients/:patientId/records')
export class PatientRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Listar prontuários de um paciente',
    description: 'ADMIN e DOCTOR visualizam prontuários de qualquer paciente. PATIENT visualiza apenas os próprios.',
  })
  @ApiParam({ name: 'patientId', type: Number, example: 2 })
  @ApiPaginatedResponse(MedicalRecordResponseDto, 'Lista paginada de prontuários do paciente.')
  @ApiResponse({ status: 403, description: 'Sem permissão para listar prontuários deste paciente.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.', type: ProblemDetailDto })
  async findByPatient(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: FindMedicalRecordsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findByPatient(patientId, query, currentUser);
    return {
      data: result.data.map((r) =>
        plainToInstance(MedicalRecordResponseDto, r, { excludeExtraneousValues: true }),
      ),
      meta: result.meta,
    };
  }
}

// ─── /doctors/:doctorId/records ───────────────────────────────────────────────

@ApiTags('Doctors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('doctors/:doctorId/records')
export class DoctorRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({
    summary: 'Listar prontuários dos atendimentos de um médico',
    description: 'ADMIN visualiza prontuários de qualquer médico. DOCTOR visualiza apenas os próprios.',
  })
  @ApiParam({ name: 'doctorId', type: Number, example: 1 })
  @ApiPaginatedResponse(MedicalRecordResponseDto, 'Lista paginada de prontuários do médico.')
  @ApiResponse({ status: 403, description: 'Sem permissão para listar prontuários deste médico.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  async findByDoctor(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query() query: FindMedicalRecordsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findByDoctor(doctorId, query, currentUser);
    return {
      data: result.data.map((r) =>
        plainToInstance(MedicalRecordResponseDto, r, { excludeExtraneousValues: true }),
      ),
      meta: result.meta,
    };
  }
}
