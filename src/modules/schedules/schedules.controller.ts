import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ProblemDetailDto } from '../../common/dto/problem-detail.dto';
import { SchedulesService } from './schedules.service';
import {
  CreateScheduleDto,
  FindSchedulesQueryDto,
  ScheduleResponseDto,
  UpdateScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/schedule.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';
import { ApiEnvelopeResponse, ApiPaginatedResponse, ApiUnauthorizedResponse } from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth('access-token')
@ApiTags('Schedules')
@ApiUnauthorizedResponse()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.PATIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar agendamento',
    description: 'ADMIN pode criar para qualquer paciente. PATIENT só pode criar para si mesmo.',
  })
  @ApiEnvelopeResponse(ScheduleResponseDto, 201, 'Agendamento criado.')
  @ApiResponse({ status: 400, description: 'Dados inválidos ou data no passado.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para criar este agendamento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico ou paciente não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Conflito de horário para o médico informado.', type: ProblemDetailDto })
  async create(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const schedule = await this.schedulesService.create(dto, currentUser);

    return plainToInstance(ScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Listar agendamentos',
    description: 'ADMIN visualiza todos. DOCTOR visualiza os próprios. PATIENT visualiza os próprios.',
  })
  @ApiPaginatedResponse(ScheduleResponseDto, 'Lista paginada de agendamentos.')
  async findAll(
    @Query() query: FindSchedulesQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.schedulesService.findAll(query, currentUser);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(ScheduleResponseDto, s, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Buscar agendamento por ID',
    description: 'ADMIN visualiza qualquer agendamento. DOCTOR e PATIENT só visualizam os próprios.',
  })
  @ApiEnvelopeResponse(ScheduleResponseDto, 200, 'Agendamento encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este agendamento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const schedule = await this.schedulesService.findOne(id, currentUser);

    return plainToInstance(ScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @Roles(UserType.ADMIN)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar agendamento',
    description: 'Apenas ADMIN pode atualizar dados do agendamento.',
  })
  @ApiEnvelopeResponse(ScheduleResponseDto, 200, 'Agendamento atualizado.')
  @ApiResponse({ status: 400, description: 'Dados inválidos ou modalidade alterada.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode atualizar agendamentos.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.', type: ProblemDetailDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleDto,
  ) {
    const schedule = await this.schedulesService.update(id, dto);

    return plainToInstance(ScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/status')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar status do agendamento',
    description: 'ADMIN pode alterar qualquer status permitido. DOCTOR altera status dos próprios. PATIENT apenas cancela os próprios.',
  })
  @ApiEnvelopeResponse(ScheduleResponseDto, 200, 'Status atualizado.')
  @ApiResponse({ status: 400, description: 'Transição de status inválida.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para alterar este status.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.', type: ProblemDetailDto })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScheduleStatusDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const schedule = await this.schedulesService.updateStatus(id, dto, currentUser);

    return plainToInstance(ScheduleResponseDto, schedule, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Excluir agendamento',
    description: 'Apenas ADMIN pode excluir agendamentos.',
  })
  @ApiResponse({ status: 204, description: 'Agendamento excluído com sucesso.' })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode excluir agendamentos.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Agendamento COMPLETED não pode ser excluído.', type: ProblemDetailDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.schedulesService.remove(id);
  }
}

@ApiBearerAuth('access-token')
@ApiTags('Doctors')
@ApiUnauthorizedResponse()
@Controller('doctors/:doctorId/schedules')
export class DoctorSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiParam({ name: 'doctorId', example: 1 })
  @ApiOperation({
    summary: 'Listar agendamentos de um médico',
    description: 'ADMIN pode listar qualquer médico. DOCTOR só pode listar os próprios agendamentos.',
  })
  @ApiPaginatedResponse(ScheduleResponseDto, 'Lista paginada de agendamentos do médico.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar os agendamentos deste médico.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  async findAll(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query() query: FindSchedulesQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.schedulesService.findByDoctor(doctorId, query, currentUser);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(ScheduleResponseDto, s, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }
}

@ApiBearerAuth('access-token')
@ApiTags('Patients')
@ApiUnauthorizedResponse()
@Controller('patients/:patientId/schedules')
export class PatientSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.PATIENT)
  @ApiParam({ name: 'patientId', example: 2 })
  @ApiOperation({
    summary: 'Listar agendamentos de um paciente',
    description: 'ADMIN pode listar qualquer paciente. PATIENT só pode listar seus próprios agendamentos.',
  })
  @ApiPaginatedResponse(ScheduleResponseDto, 'Lista paginada de agendamentos do paciente.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar os agendamentos deste paciente.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.', type: ProblemDetailDto })
  async findAll(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: FindSchedulesQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.schedulesService.findByPatient(patientId, query, currentUser);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(ScheduleResponseDto, s, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }
}