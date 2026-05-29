import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
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
import { ProceduresService } from './procedures.service';
import {
  CreateProcedureDto,
  DenyProcedureDto,
  FindProceduresQueryDto,
  ProcedureResponseDto,
  UpdateProcedureDto,
} from './dto/procedure.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';

// ─── /procedures ──────────────────────────────────────────────────────────────

@ApiTags('Procedures')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar procedimento a um atendimento IN_PROGRESS' })
  async create(
    @Body() dto: CreateProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.create(dto, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Buscar procedimento por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.findOne(id, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({ summary: 'Atualizar dados de um procedimento' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.update(id, dto, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Patch(':id/authorize')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Autorizar procedimento especializado (PENDING → AUTHORIZED)' })
  @ApiParam({ name: 'id', type: Number })
  async authorize(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.authorize(id, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Patch(':id/deny')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Negar procedimento especializado (PENDING → DENIED)' })
  @ApiParam({ name: 'id', type: Number })
  async deny(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DenyProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.deny(id, dto, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover procedimento de atendimento IN_PROGRESS' })
  @ApiParam({ name: 'id', type: Number })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    await this.proceduresService.remove(id, currentUser);
  }
}

// ─── /appointments/:appointmentId/procedures ──────────────────────────────────

@ApiTags('Procedures')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@Controller('appointments/:appointmentId/procedures')
export class AppointmentProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Listar procedimentos de um atendimento' })
  @ApiParam({ name: 'appointmentId', type: Number })
  async findByAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Query() query: FindProceduresQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.findByAppointment(appointmentId, query, currentUser);
    return {
      data: result.data.map((p) =>
        plainToInstance(ProcedureResponseDto, p, { excludeExtraneousValues: true }),
      ),
      meta: result.meta,
    };
  }
}
