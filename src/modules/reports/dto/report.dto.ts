import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ReportStatus } from '../entities/report.entity';

export class RevokeReportDto {
  @ApiProperty({ example: 'Laudo emitido com informação incorreta.' })
  @IsString()
  @IsNotEmpty()
  revokedReason: string;
}

export class FindReportsQueryDto extends PaginationQueryDto {}

export class ReportResponseDto {
  @Expose() @ApiProperty({ description: 'ID do laudo', example: 1 })
  id: number;

  @Expose() @ApiProperty({ description: 'ID do atendimento (exame)', example: 1 })
  appointmentId: number;

  @Expose() @ApiProperty({ description: 'ID do médico que emitiu', example: 1 })
  doctorId: number;

  @Expose() @ApiProperty({ description: 'ID do paciente', example: 2 })
  patientId: number;

  @Expose() @ApiProperty({ description: 'Código UUID de validação pública', example: 'beef47fa-fb66-41f6-9665-9e2e0f1669c8' })
  validationCode: string;

  @Expose() @ApiProperty({ enum: ReportStatus, example: ReportStatus.ACTIVE })
  status: ReportStatus;

  @Expose() @ApiProperty({ description: 'Data de emissão', example: '2026-06-07T09:00:00.000Z' })
  issuedAt: Date;

  @Expose() @ApiProperty({ description: 'ID do usuário que emitiu', example: 1 })
  issuedBy: number;

  @Expose() @ApiPropertyOptional({ description: 'Data de revogação', example: null, nullable: true })
  revokedAt: Date | null;

  @Expose() @ApiPropertyOptional({ description: 'ID do usuário que revogou', example: null, nullable: true })
  revokedBy: number | null;

  @Expose() @ApiPropertyOptional({ description: 'Motivo da revogação', example: null, nullable: true })
  revokedReason: string | null;

  @Expose() @ApiProperty({ example: '2026-06-07T09:00:00.000Z' })
  createdAt: Date;

  @Expose() @ApiProperty({ example: '2026-06-07T09:00:00.000Z' })
  updatedAt: Date;
}

export class PublicReportValidationDto {
  @Expose() @ApiProperty({ description: 'Código UUID de validação', example: 'beef47fa-fb66-41f6-9665-9e2e0f1669c8' })
  validationCode: string;

  @Expose() @ApiProperty({ enum: ReportStatus, example: ReportStatus.ACTIVE })
  status: ReportStatus;

  @Expose() @ApiProperty({ description: 'Data de emissão do laudo', example: '2026-06-07T09:00:00.000Z' })
  issuedAt: Date;

  @Expose() @ApiProperty({ description: 'Nome completo do paciente', example: 'João da Silva' })
  patientName: string;

  @Expose() @ApiProperty({ description: 'Nome do médico com CRM', example: 'Dra. Ana Cardoso (CRM 54321-SP)' })
  doctorName: string;

  @Expose() @ApiProperty({ description: 'Tipo do exame', example: 'hemograma' })
  examType: string;

  @Expose() @ApiPropertyOptional({ description: 'Data de revogação (preenchido somente se REVOKED)', example: null, nullable: true })
  revokedAt?: Date | null;

  @Expose() @ApiPropertyOptional({ description: 'Motivo da revogação (preenchido somente se REVOKED)', example: null, nullable: true })
  revokedReason?: string | null;
}
