import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { ProblemDetailDto } from '../../common/dto/problem-detail.dto';
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
  ApiUnauthorizedResponse,
} from '../../common/decorators/api-responses.decorator';
import { ReportsService } from './reports.service';
import {
  FindReportsQueryDto,
  PublicReportValidationDto,
  ReportResponseDto,
  RevokeReportDto,
} from './dto/report.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';

@ApiTags('Reports')
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('appointments/:appointmentId/report')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse()
  @ApiOperation({
    summary: 'Emitir laudo para exame encerrado com resultado',
    description: 'ADMIN e DOCTOR podem emitir. Pré-condições: o atendimento deve ser do tipo EXAM, estar FINISHED e ter o campo `result` preenchido. O laudo gerado recebe um `validationCode` UUID único que pode ser verificado publicamente em `GET /reports/validate/{code}`.',
  })
  @ApiParam({ name: 'appointmentId', type: Number, example: 1 })
  @ApiEnvelopeResponse(ReportResponseDto, 201, 'Laudo emitido com sucesso.')
  @ApiResponse({ status: 400, description: 'Atendimento não é EXAM, não está FINISHED ou não tem resultado preenchido.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para emitir laudo neste atendimento.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Atendimento não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Já existe um laudo ACTIVE para este exame.', type: ProblemDetailDto })
  async issue(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.issue(appointmentId, currentUser);
    return plainToInstance(ReportResponseDto, result, { excludeExtraneousValues: true });
  }

  // Esta rota deve vir antes de /reports/:id/pdf para evitar conflito de roteamento
  @Public()
  @Get('reports/validate/:code')
  @ApiOperation({
    summary: 'Validar publicamente um laudo por código',
    description: '**Endpoint público — não requer autenticação.** Verifica a autenticidade de um laudo pelo código UUID impresso no PDF. Para laudos REVOKED retorna os dados de revogação.',
  })
  @ApiParam({ name: 'code', type: String, example: 'beef47fa-fb66-41f6-9665-9e2e0f1669c8' })
  @ApiEnvelopeResponse(PublicReportValidationDto, 200, 'Laudo encontrado e validado.')
  @ApiResponse({ status: 404, description: 'Código de validação não encontrado.', type: ProblemDetailDto })
  async validate(@Param('code') code: string) {
    const result = await this.reportsService.validateByCode(code);
    return plainToInstance(PublicReportValidationDto, result, {
      excludeExtraneousValues: true,
    });
  }

  @Get('reports/:id/pdf')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse()
  @ApiOperation({
    summary: 'Baixar laudo em PDF',
    description: 'Retorna o arquivo PDF do laudo. O cabeçalho `Content-Disposition: attachment; filename="laudo-{id}.pdf"` força o download. ADMIN acessa qualquer laudo; DOCTOR e PATIENT acessam apenas os próprios.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'PDF do laudo para download.',
    headers: {
      'Content-Disposition': {
        description: 'Indica que o arquivo deve ser baixado com o nome especificado.',
        schema: { type: 'string', example: 'attachment; filename="laudo-1.pdf"' },
      },
      'Content-Type': {
        description: 'Tipo MIME do arquivo retornado.',
        schema: { type: 'string', example: 'application/pdf' },
      },
    },
    content: {
      'application/pdf': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para baixar este laudo.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Laudo não encontrado.', type: ProblemDetailDto })
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
    @Res() res: Response,
  ) {
    const { buffer, validationCode } = await this.reportsService.getPdf(id, currentUser);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laudo-${validationCode}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch('reports/:id/revoke')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse()
  @ApiOperation({
    summary: 'Revogar laudo ativo',
    description: 'Transição irreversível: ACTIVE → REVOKED. ADMIN e DOCTOR podem revogar. Exige `revokedReason`. Após a revogação, o `validationCode` continua válido mas retorna o status REVOKED com os dados de revogação.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(ReportResponseDto, 200, 'Laudo revogado com sucesso.')
  @ApiResponse({ status: 400, description: 'Laudo já foi revogado ou revokedReason ausente.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para revogar este laudo.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Laudo não encontrado.', type: ProblemDetailDto })
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevokeReportDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.revoke(id, dto, currentUser);
    return plainToInstance(ReportResponseDto, result, { excludeExtraneousValues: true });
  }

  @Get('reports/:id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiBearerAuth('access-token')
  @ApiUnauthorizedResponse()
  @ApiOperation({
    summary: 'Buscar laudo por ID',
    description: 'ADMIN acessa qualquer laudo. DOCTOR e PATIENT acessam apenas os próprios. Para verificação pública sem autenticação use `GET /reports/validate/{code}`.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiEnvelopeResponse(ReportResponseDto, 200, 'Laudo encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este laudo.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Laudo não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.findOne(id, currentUser);
    return plainToInstance(ReportResponseDto, result, { excludeExtraneousValues: true });
  }
}

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('patients/:patientId/reports')
export class PatientReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Listar laudos de um paciente',
    description: 'ADMIN e DOCTOR visualizam laudos de qualquer paciente. PATIENT visualiza apenas os próprios.',
  })
  @ApiParam({ name: 'patientId', type: Number, example: 2 })
  @ApiPaginatedResponse(ReportResponseDto, 'Lista paginada de laudos do paciente.')
  @ApiResponse({ status: 403, description: 'Sem permissão para listar laudos deste paciente.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.', type: ProblemDetailDto })
  async findByPatient(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query() query: FindReportsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.findByPatient(patientId, query, currentUser);

    return {
      data: result.data.map((r) =>
        plainToInstance(ReportResponseDto, r, { excludeExtraneousValues: true }),
      ),
      meta: result.meta,
    };
  }
}

@ApiTags('Doctors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@Controller('doctors/:doctorId/reports')
export class DoctorReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({
    summary: 'Listar laudos emitidos por um médico',
    description: 'ADMIN visualiza laudos de qualquer médico. DOCTOR visualiza apenas os próprios.',
  })
  @ApiParam({ name: 'doctorId', type: Number, example: 1 })
  @ApiPaginatedResponse(ReportResponseDto, 'Lista paginada de laudos do médico.')
  @ApiResponse({ status: 403, description: 'Sem permissão para listar laudos deste médico.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  async findByDoctor(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query() query: FindReportsQueryDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.findByDoctor(doctorId, query, currentUser);

    return {
      data: result.data.map((r) =>
        plainToInstance(ReportResponseDto, r, { excludeExtraneousValues: true }),
      ),
      meta: result.meta,
    };
  }
}
