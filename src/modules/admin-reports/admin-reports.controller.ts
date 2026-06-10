import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../users/entities/user.entity';
import { ProblemDetailDto } from '../../common/dto/problem-detail.dto';
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from '../../common/decorators/api-responses.decorator';

const metaExample = (path: string) => ({
  timestamp: '2026-06-07T09:00:00.000Z',
  path,
});

@ApiTags('Admin Reports')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse('Apenas ADMIN pode acessar relatórios administrativos.', '/admin/reports')
@Controller('admin/reports')
@Roles(UserType.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get('schedules')
  @ApiOperation({
    summary: 'Relatório administrativo de agendamentos',
    description:
      'Retorna um objeto único **não paginado** com totais agregados de agendamentos no período. ' +
      'Estrutura: `total` (contagem geral), `byStatus` (distribuição por PENDING/CONFIRMED/CANCELLED/COMPLETED) e ' +
      '`byType` (distribuição por IN_PERSON/ONLINE/HOME). Filtros de período opcionais.',
  })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01', description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31', description: 'Data de fim (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Totais de agendamentos por status e modalidade.',
    content: {
      'application/json': {
        schema: {
          example: {
            data: {
              total: 47,
              byStatus: [
                { status: 'PENDING', count: '12' },
                { status: 'CONFIRMED', count: '18' },
                { status: 'CANCELLED', count: '8' },
                { status: 'COMPLETED', count: '9' },
              ],
              byType: [
                { type: 'IN_PERSON', count: '30' },
                { type: 'ONLINE', count: '12' },
                { type: 'HOME', count: '5' },
              ],
            },
            meta: metaExample('/admin/reports/schedules'),
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'startDate posterior a endDate.', type: ProblemDetailDto })
  schedules(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.schedules(startDate, endDate);
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'Relatório administrativo de atendimentos',
    description:
      'Retorna um objeto único **não paginado** com totais agregados de atendimentos no período. ' +
      'Estrutura: `total` (contagem geral), `byType` (distribuição por CONSULTATION/EXAM/FOLLOW_UP) e ' +
      '`byStatus` (distribuição por IN_PROGRESS/FINISHED). Filtros opcionais por período e médico.',
  })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01', description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31', description: 'Data de fim (ISO 8601)' })
  @ApiQuery({ name: 'doctorId', required: false, example: 1, description: 'Filtrar por médico' })
  @ApiResponse({
    status: 200,
    description: 'Totais de atendimentos por tipo e status.',
    content: {
      'application/json': {
        schema: {
          example: {
            data: {
              total: 31,
              byType: [
                { type: 'CONSULTATION', count: '18' },
                { type: 'EXAM', count: '10' },
                { type: 'FOLLOW_UP', count: '3' },
              ],
              byStatus: [
                { status: 'IN_PROGRESS', count: '6' },
                { status: 'FINISHED', count: '25' },
              ],
            },
            meta: metaExample('/admin/reports/appointments'),
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'startDate posterior a endDate.', type: ProblemDetailDto })
  appointments(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.adminReportsService.appointments(
      startDate,
      endDate,
      doctorId ? Number(doctorId) : undefined,
    );
  }

  @Get('procedures')
  @ApiOperation({
    summary: 'Relatório administrativo de procedimentos',
    description:
      'Retorna um objeto único **não paginado** com totais agregados de procedimentos no período. ' +
      'Estrutura: `total` (contagem geral), `byType` (SIMPLE/SPECIALIZED), ' +
      '`byAuthorizationStatus` (PENDING/AUTHORIZED/DENIED) e `byComplexityLevel` (LOW/MEDIUM/HIGH). ' +
      'Filtros de período opcionais.',
  })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01', description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31', description: 'Data de fim (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Totais de procedimentos por tipo, status de autorização e complexidade.',
    content: {
      'application/json': {
        schema: {
          example: {
            data: {
              total: 54,
              byType: [
                { type: 'SIMPLE', count: '35' },
                { type: 'SPECIALIZED', count: '19' },
              ],
              byAuthorizationStatus: [
                { authorizationStatus: 'PENDING', count: '5' },
                { authorizationStatus: 'AUTHORIZED', count: '12' },
                { authorizationStatus: 'DENIED', count: '2' },
              ],
              byComplexityLevel: [
                { complexityLevel: 'LOW', count: '8' },
                { complexityLevel: 'MEDIUM', count: '7' },
                { complexityLevel: 'HIGH', count: '4' },
              ],
            },
            meta: metaExample('/admin/reports/procedures'),
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'startDate posterior a endDate.', type: ProblemDetailDto })
  procedures(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.procedures(startDate, endDate);
  }

  @Get('doctors/:doctorId/occupation')
  @ApiOperation({
    summary: 'Relatório de ocupação da agenda de um médico',
    description:
      'Retorna um objeto único **não paginado** com a taxa de ocupação do médico no período. ' +
      'Estrutura: `doctorId`, `total` (agendamentos no período), `byStatus` (distribuição por status), ' +
      '`occupationRate` (percentual — CONFIRMED + COMPLETED / total) e `occupationRateFormula` (descrição do cálculo). ' +
      'Filtros de período opcionais.',
  })
  @ApiParam({ name: 'doctorId', type: Number, example: 1 })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01', description: 'Data de início (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31', description: 'Data de fim (ISO 8601)' })
  @ApiResponse({
    status: 200,
    description: 'Taxa de ocupação e distribuição de agendamentos do médico no período.',
    content: {
      'application/json': {
        schema: {
          example: {
            data: {
              doctorId: 1,
              total: 20,
              byStatus: [
                { status: 'PENDING', count: '3' },
                { status: 'CONFIRMED', count: '8' },
                { status: 'CANCELLED', count: '2' },
                { status: 'COMPLETED', count: '7' },
              ],
              occupationRate: 75.00,
              occupationRateFormula: '(CONFIRMED + COMPLETED) / total de agendamentos do médico no período',
            },
            meta: metaExample('/admin/reports/doctors/1/occupation'),
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'startDate posterior a endDate.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  doctorOccupation(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.doctorOccupation(doctorId, startDate, endDate);
  }
}
