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
  ApiBody,
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
import { ProceduresService } from './procedures.service';
import {
  AuthorizeProcedureDto,
  DenyProcedureDto,
  CreateProcedureDto,
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
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Buscar procedimento por ID',
    description: 'ADMIN e DOCTOR visualizam qualquer procedimento. PATIENT visualiza apenas procedimentos de seus próprios atendimentos.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(ProcedureResponseDto, 200, 'Procedimento encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este procedimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Procedimento não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.findOne(id, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({
    summary: 'Atualizar dados de um procedimento',
    description: 'ADMIN e DOCTOR podem atualizar. O atendimento associado deve estar IN_PROGRESS — procedimentos de atendimentos FINISHED são imutáveis.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(ProcedureResponseDto, 200, 'Procedimento atualizado.')
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar este procedimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Procedimento não encontrado.', type: ProblemDetailDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.update(id, dto, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Patch(':id/authorization')
  @Roles(UserType.ADMIN)
  @ApiOperation({
    summary: 'Autorizar ou negar procedimento especializado',
    description: 'Use `action: "AUTHORIZE"` para aprovar ou `action: "DENY"` (com `deniedReason` opcional) para negar. Apenas procedimentos PENDING podem ser alterados.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(ProcedureResponseDto, 200, 'Status de autorização atualizado.')
  @ApiResponse({ status: 400, description: 'Procedimento não requer autorização, não é SPECIALIZED ou já foi DENIED.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode autorizar ou negar procedimentos.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Procedimento não encontrado.', type: ProblemDetailDto })
  async setAuthorization(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AuthorizeProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    let result;
    if (dto.action === 'AUTHORIZE') {
      result = await this.proceduresService.authorize(id, currentUser);
    } else {
      result = await this.proceduresService.deny(id, { deniedReason: dto.deniedReason } as DenyProcedureDto, currentUser);
    }
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover procedimento de atendimento IN_PROGRESS',
    description: 'ADMIN e DOCTOR podem remover. O atendimento associado deve estar IN_PROGRESS. Após o atendimento ser encerrado (FINISHED), o procedimento não pode mais ser removido.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 204, description: 'Procedimento removido com sucesso.' })
  @ApiResponse({ status: 403, description: 'Sem permissão para remover este procedimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Procedimento não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Não é possível remover procedimento de atendimento FINISHED.', type: ProblemDetailDto })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    await this.proceduresService.remove(id, currentUser);
  }
}

// ─── /appointments/:appointmentId/procedures ──────────────────────────────────

@ApiTags('Procedures')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('appointments/:appointmentId/procedures')
export class AppointmentProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Post()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar procedimento a um atendimento IN_PROGRESS',
    description: 'ADMIN e DOCTOR podem adicionar procedimentos. O atendimento deve estar IN_PROGRESS. Procedimentos SPECIALIZED com `requiresAuthorization: true` iniciam com `authorizationStatus: PENDING` e precisam ser aprovados via `PATCH /procedures/{id}/authorization`.',
  })
  @ApiParam({ name: 'appointmentId', type: Number, example: 1 })
  @ApiBody({
    schema: {
      oneOf: [
        {
          title: 'SIMPLE',
          required: ['name', 'description', 'type'],
          properties: {
            name: { type: 'string', example: 'Eletrocardiograma' },
            description: { type: 'string', example: 'Registro da atividade elétrica do coração.' },
            type: { type: 'string', enum: ['SIMPLE'], example: 'SIMPLE' },
            estimatedDuration: { type: 'integer', example: 30, description: 'Duração estimada em minutos' },
          },
          example: {
            name: 'Eletrocardiograma',
            description: 'Registro da atividade elétrica do coração.',
            type: 'SIMPLE',
            estimatedDuration: 30,
          },
        },
        {
          title: 'SPECIALIZED',
          required: ['name', 'description', 'type'],
          properties: {
            name: { type: 'string', example: 'Eletrocardiograma com Mapeamento de 12 Derivações' },
            description: { type: 'string', example: 'Registro elétrico cardíaco com análise de 12 derivações.' },
            type: { type: 'string', enum: ['SPECIALIZED'], example: 'SPECIALIZED' },
            requiredEquipment: { type: 'string', example: 'Eletrocardiógrafo digital' },
            complexityLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'MEDIUM' },
            requiresAuthorization: { type: 'boolean', example: true },
          },
          example: {
            name: 'Eletrocardiograma com Mapeamento de 12 Derivações',
            description: 'Registro elétrico cardíaco com análise de 12 derivações.',
            type: 'SPECIALIZED',
            requiredEquipment: 'Eletrocardiógrafo digital',
            complexityLevel: 'MEDIUM',
            requiresAuthorization: true,
          },
        },
      ],
      discriminator: { propertyName: 'type' },
    },
  })
  @ApiEnvelopeResponse(ProcedureResponseDto, 201, 'Procedimento adicionado com sucesso.')
  @ApiResponse({ status: 400, description: 'Atendimento não está IN_PROGRESS ou campos inválidos.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para adicionar procedimento neste atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
  async create(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Body() dto: CreateProcedureDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.proceduresService.create(dto, appointmentId, currentUser);
    return plainToInstance(ProcedureResponseDto, result, { excludeExtraneousValues: true });
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Listar procedimentos de um atendimento',
    description: 'ADMIN visualiza procedimentos de qualquer atendimento. DOCTOR e PATIENT visualizam apenas os de seus próprios atendimentos. Suporta filtros por `type` e `authorizationStatus`.',
  })
  @ApiParam({ name: 'appointmentId', type: Number, example: 1 })
  @ApiPaginatedResponse(ProcedureResponseDto, 'Lista paginada de procedimentos do atendimento.')
  @ApiResponse({ status: 403, description: 'Sem permissão para listar procedimentos deste atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
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
