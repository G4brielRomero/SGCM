import {
  Controller, Get, Post, Body, Param, Delete, Put, Patch, Query,
  HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { SchedulesService } from './schedules.service';
import {
  CreateScheduleDto,
  FindSchedulesQueryDto,
  ScheduleResponseDto,
  UpdateScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/schedule.dto';
import { ScheduleStatus, ScheduleType } from './entities/schedule.entity';

@ApiTags('Schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar agendamento',
    description: 'Cria um agendamento em uma das três modalidades (IN_PERSON, ONLINE, HOME). Status inicial é sempre PENDING.',
  })
  @ApiResponse({ status: 201, type: ScheduleResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou data no passado.' })
  @ApiResponse({ status: 404, description: 'Médico ou paciente não encontrado.' })
  @ApiResponse({ status: 409, description: 'Conflito de horário para o médico informado.' })
  async create(@Body() dto: CreateScheduleDto) {
    const schedule = await this.schedulesService.create(dto);
    return plainToInstance(ScheduleResponseDto, schedule, { excludeExtraneousValues: true });
  }

  @Get()
  @ApiOperation({
    summary: 'Listar agendamentos',
    description: 'Lista paginada com filtros por doctorId, patientId, status, type e intervalo de datas.',
  })
  @ApiQuery({ name: 'doctorId', required: false, type: Number })
  @ApiQuery({ name: 'patientId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ScheduleStatus })
  @ApiQuery({ name: 'type', required: false, enum: ScheduleType })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'sort', required: false, example: 'scheduledAt:asc' })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: FindSchedulesQueryDto) {
    const result = await this.schedulesService.findAll(query);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(ScheduleResponseDto, s, { excludeExtraneousValues: true }),
      ),
    };
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  @ApiResponse({ status: 404 })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const schedule = await this.schedulesService.findOne(id);
    return plainToInstance(ScheduleResponseDto, schedule, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar agendamento',
    description: 'Atualiza dados do agendamento. Não permite atualizar status por este endpoint.',
  })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 404 })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto) {
    const schedule = await this.schedulesService.update(id, dto);
    return plainToInstance(ScheduleResponseDto, schedule, { excludeExtraneousValues: true });
  }

  @Patch(':id/status')
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar status do agendamento',
    description: 'Aceita apenas CONFIRMED e CANCELLED. COMPLETED é gerado automaticamente ao criar um Appointment (Etapa 3).',
  })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida ou valor COMPLETED enviado.' })
  @ApiResponse({ status: 404 })
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleStatusDto) {
    const schedule = await this.schedulesService.updateStatus(id, dto);
    return plainToInstance(ScheduleResponseDto, schedule, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Excluir agendamento',
    description: 'Agendamentos com status COMPLETED não podem ser excluídos.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409, description: 'Agendamento COMPLETED não pode ser excluído.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.schedulesService.remove(id);
  }
}

@ApiTags('Doctors')
@Controller('doctors/:doctorId/schedules')
export class DoctorSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiParam({ name: 'doctorId', example: 1 })
  @ApiOperation({ summary: 'Listar agendamentos de um médico' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findAll(@Param('doctorId', ParseIntPipe) doctorId: number, @Query() query: FindSchedulesQueryDto) {
    const result = await this.schedulesService.findByDoctor(doctorId, query);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(ScheduleResponseDto, s, { excludeExtraneousValues: true }),
      ),
    };
  }
}

@ApiTags('Patients')
@Controller('patients/:patientId/schedules')
export class PatientSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiParam({ name: 'patientId', example: 2 })
  @ApiOperation({ summary: 'Listar agendamentos de um paciente' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async findAll(@Param('patientId', ParseIntPipe) patientId: number, @Query() query: FindSchedulesQueryDto) {
    const result = await this.schedulesService.findByPatient(patientId, query);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(ScheduleResponseDto, s, { excludeExtraneousValues: true }),
      ),
    };
  }
}