import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../users/entities/user.entity';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@Roles(UserType.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get('schedules')
  @ApiOperation({ summary: 'Relatório administrativo de agendamentos' })
  schedules(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.schedules(startDate, endDate);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Relatório administrativo de atendimentos' })
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
  @ApiOperation({ summary: 'Relatório administrativo de procedimentos' })
  procedures(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.procedures(startDate, endDate);
  }

  @Get('doctors/:doctorId/occupation')
  @ApiOperation({ summary: 'Relatório de ocupação da agenda de um médico' })
  doctorOccupation(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.doctorOccupation(doctorId, startDate, endDate);
  }
}