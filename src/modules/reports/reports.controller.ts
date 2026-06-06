import {
  Body,
  Controller,
  Get,
  Header,
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
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { plainToInstance } from 'class-transformer';
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
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('appointments/:appointmentId/report')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({ summary: 'Emitir laudo para exame encerrado com resultado' })
  @ApiParam({ name: 'appointmentId', type: Number })
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
  @ApiOperation({ summary: 'Validar publicamente um laudo por código' })
  @ApiParam({ name: 'code', type: String })
  async validate(@Param('code') code: string) {
    const result = await this.reportsService.validateByCode(code);
    return plainToInstance(PublicReportValidationDto, result, {
      excludeExtraneousValues: true,
    });
  }

  @Get('reports/:id/pdf')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Baixar laudo em PDF' })
  @ApiParam({ name: 'id', type: Number })
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.getPdf(id, currentUser);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laudo-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Patch('reports/:id/revoke')
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({ summary: 'Revogar laudo ativo' })
  @ApiParam({ name: 'id', type: Number })
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
  @ApiOperation({ summary: 'Buscar laudo por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const result = await this.reportsService.findOne(id, currentUser);
    return plainToInstance(ReportResponseDto, result, { excludeExtraneousValues: true });
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('patients/:patientId/reports')
export class PatientReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({ summary: 'Listar laudos de um paciente' })
  @ApiParam({ name: 'patientId', type: Number })
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

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('doctors/:doctorId/reports')
export class DoctorReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({ summary: 'Listar laudos emitidos por um médico' })
  @ApiParam({ name: 'doctorId', type: Number })
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