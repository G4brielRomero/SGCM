import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AppointmentStatus, AppointmentType } from '../entities/appointment.entity';

// ─────────────────────────────────────────────────────────────
// CREATE DTOs
// ─────────────────────────────────────────────────────────────

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID do agendamento confirmado que origina este atendimento', example: 1 })
  @IsInt()
  @Min(1)
  scheduleId: number;

  @ApiProperty({ enum: AppointmentType, description: 'Tipo do atendimento' })
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @ApiPropertyOptional({ description: 'Observações gerais do atendimento' })
  @IsOptional()
  @IsString()
  notes?: string;

  // ── Consultation ─────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[CONSULTATION] Motivo da consulta (obrigatório para CONSULTATION)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '[CONSULTATION] Hipótese diagnóstica inicial' })
  @IsOptional()
  @IsString()
  diagnosticHypothesis?: string;

  // ── Exam ──────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[EXAM] Tipo de exame (obrigatório para EXAM)', example: 'hemograma' })
  @IsOptional()
  @IsString()
  examType?: string;

  @ApiPropertyOptional({ description: '[EXAM] Resultado do exame (pode ser preenchido depois)' })
  @IsOptional()
  @IsString()
  result?: string;

  // ── FollowUp ──────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[FOLLOW_UP] ID do atendimento anterior que originou este retorno (obrigatório para FOLLOW_UP)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  originAppointmentId?: number;

  @ApiPropertyOptional({ description: '[FOLLOW_UP] Evolução clínica em relação ao atendimento anterior' })
  @IsOptional()
  @IsString()
  clinicalEvolution?: string;
}

// ─────────────────────────────────────────────────────────────
// UPDATE DTO — apenas atributos mutáveis em IN_PROGRESS
// ─────────────────────────────────────────────────────────────

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ description: 'Observações gerais do atendimento' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Consultation
  @ApiPropertyOptional({ description: '[CONSULTATION] Hipótese diagnóstica' })
  @IsOptional()
  @IsString()
  diagnosticHypothesis?: string;

  // Exam — result pode ser preenchido durante atendimento
  @ApiPropertyOptional({ description: '[EXAM] Resultado do exame' })
  @IsOptional()
  @IsString()
  result?: string;

  // FollowUp
  @ApiPropertyOptional({ description: '[FOLLOW_UP] Evolução clínica' })
  @IsOptional()
  @IsString()
  clinicalEvolution?: string;
}

// ─────────────────────────────────────────────────────────────
// QUERY DTO
// ─────────────────────────────────────────────────────────────

export class FindAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID do médico', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  doctorId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID do paciente', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  patientId?: number;

  @ApiPropertyOptional({ enum: AppointmentType, description: 'Filtrar por tipo' })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiPropertyOptional({ enum: AppointmentStatus, description: 'Filtrar por status' })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Data de início do intervalo (ISO 8601)', example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de fim do intervalo (ISO 8601)', example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

// ─────────────────────────────────────────────────────────────
// RESPONSE DTO
// ─────────────────────────────────────────────────────────────

export class AppointmentResponseDto {
  @Expose() @ApiProperty({ example: 1 })
  id: number;

  @Expose() @ApiProperty({ enum: AppointmentType })
  type: AppointmentType;

  @Expose() @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @Expose() @ApiProperty({ example: 1 })
  scheduleId: number;

  @Expose() @ApiProperty({ example: 1 })
  doctorId: number;

  @Expose() @ApiProperty({ example: 2 })
  patientId: number;

  @Expose() @ApiPropertyOptional()
  notes?: string;

  @Expose() @ApiPropertyOptional()
  startedAt?: Date;

  @Expose() @ApiPropertyOptional()
  endedAt?: Date;

  // Consultation
  @Expose() @ApiPropertyOptional()
  reason?: string;

  @Expose() @ApiPropertyOptional()
  diagnosticHypothesis?: string;

  // Exam
  @Expose() @ApiPropertyOptional()
  examType?: string;

  @Expose() @ApiPropertyOptional()
  result?: string;

  // FollowUp
  @Expose() @ApiPropertyOptional()
  originAppointmentId?: number;

  @Expose() @ApiPropertyOptional()
  clinicalEvolution?: string;

  @Expose() @ApiProperty()
  createdAt: Date;

  @Expose() @ApiProperty()
  updatedAt: Date;
}
