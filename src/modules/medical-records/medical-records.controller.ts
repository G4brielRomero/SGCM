import {
  Body,
  Controller,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
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

// ─── /medical-records ─────────────────────────────────────────────────────────

@ApiTags('Medical Records')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar prontuário para atendimento FINISHED' })
  async create(
    @Body() dto: CreateMedicalRecordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.create(dto, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Buscar prontuário por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findOne(id, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({ summary: 'Atualizar prontuário (prescription, notes)' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicalRecordDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.update(id, dto, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }
}

// ─── /appointments/:appointmentId/record ──────────────────────────────────────

@ApiTags('Medical Records')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@Controller('appointments/:appointmentId/record')
export class AppointmentRecordController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Buscar prontuário de um atendimento específico' })
  @ApiParam({ name: 'appointmentId', type: Number })
  async findByAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.medicalRecordsService.findByAppointment(appointmentId, currentUser);
    return plainToInstance(MedicalRecordResponseDto, result, { excludeExtraneousValues: true });
  }
}

// ─── /patients/:patientId/records ─────────────────────────────────────────────

@ApiTags('Medical Records')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@Controller('patients/:patientId/records')
export class PatientRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Listar prontuários de um paciente' })
  @ApiParam({ name: 'patientId', type: Number })
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

@ApiTags('Medical Records')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@Controller('doctors/:doctorId/records')
export class DoctorRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({ summary: 'Listar prontuários dos atendimentos de um médico' })
  @ApiParam({ name: 'doctorId', type: Number })
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
