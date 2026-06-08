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

  @ApiProperty({ enum: AppointmentType, description: 'Tipo do atendimento', example: AppointmentType.CONSULTATION })
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @ApiPropertyOptional({ description: 'Observações gerais do atendimento', example: 'Paciente com dificuldade de locomoção.' })
  @IsOptional()
  @IsString()
  notes?: string;

  // ── Consultation ─────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[CONSULTATION] Motivo da consulta (obrigatório para CONSULTATION)', example: 'Dor de cabeça frequente há 2 semanas.' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '[CONSULTATION] Hipótese diagnóstica inicial', example: 'Enxaqueca tensional.' })
  @IsOptional()
  @IsString()
  diagnosticHypothesis?: string;

  // ── Exam ──────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[EXAM] Tipo de exame (obrigatório para EXAM)', example: 'hemograma' })
  @IsOptional()
  @IsString()
  examType?: string;

  @ApiPropertyOptional({ description: '[EXAM] Resultado do exame (pode ser preenchido depois)', example: 'Eritrócitos 4,5 M/μL, leucócitos 6.500/μL — dentro dos limites normais.' })
  @IsOptional()
  @IsString()
  result?: string;

  // ── FollowUp ──────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[FOLLOW_UP] ID do atendimento anterior que originou este retorno (obrigatório para FOLLOW_UP)', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  originAppointmentId?: number;

  @ApiPropertyOptional({ description: '[FOLLOW_UP] Evolução clínica em relação ao atendimento anterior', example: 'Paciente apresentou melhora após medicação inicial.' })
  @IsOptional()
  @IsString()
  clinicalEvolution?: string;
}

// ─────────────────────────────────────────────────────────────
// UPDATE DTO — apenas atributos mutáveis em IN_PROGRESS
// ─────────────────────────────────────────────────────────────

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ description: 'Observações gerais do atendimento', example: 'Paciente relatou melhora parcial dos sintomas.' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Consultation
  @ApiPropertyOptional({ description: '[CONSULTATION] Hipótese diagnóstica', example: 'Hipertensão essencial confirmada.' })
  @IsOptional()
  @IsString()
  diagnosticHypothesis?: string;

  // Exam — result pode ser preenchido durante atendimento
  @ApiPropertyOptional({ description: '[EXAM] Resultado do exame', example: 'Resultado dentro dos limites normais.' })
  @IsOptional()
  @IsString()
  result?: string;

  // FollowUp
  @ApiPropertyOptional({ description: '[FOLLOW_UP] Evolução clínica', example: 'Pressão arterial estabilizada com medicação.' })
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

  @ApiPropertyOptional({ enum: AppointmentType, description: 'Filtrar por tipo', example: AppointmentType.CONSULTATION })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiPropertyOptional({ enum: AppointmentStatus, description: 'Filtrar por status', example: AppointmentStatus.IN_PROGRESS })
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
  @Expose() @ApiProperty({ description: 'ID do atendimento', example: 1 })
  id: number;

  @Expose() @ApiProperty({ enum: AppointmentType, example: AppointmentType.CONSULTATION })
  type: AppointmentType;

  @Expose() @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.IN_PROGRESS })
  status: AppointmentStatus;

  @Expose() @ApiProperty({ description: 'ID do agendamento que originou este atendimento', example: 1 })
  scheduleId: number;

  @Expose() @ApiProperty({ description: 'ID do médico', example: 1 })
  doctorId: number;

  @Expose() @ApiProperty({ description: 'ID do paciente', example: 2 })
  patientId: number;

  @Expose() @ApiPropertyOptional({ description: 'Observações gerais', example: 'Paciente com dificuldade de locomoção.' })
  notes?: string;

  @Expose() @ApiPropertyOptional({ description: 'Início do atendimento (ISO 8601)', example: '2026-06-07T09:00:00.000Z' })
  startedAt?: Date;

  @Expose() @ApiPropertyOptional({ description: 'Encerramento do atendimento (ISO 8601)', example: '2026-06-07T10:15:00.000Z' })
  endedAt?: Date;

  // Consultation
  @Expose() @ApiPropertyOptional({ description: '[CONSULTATION] Motivo da consulta', example: 'Dor de cabeça frequente há 2 semanas.' })
  reason?: string;

  @Expose() @ApiPropertyOptional({ description: '[CONSULTATION] Hipótese diagnóstica', example: 'Enxaqueca tensional.' })
  diagnosticHypothesis?: string;

  // Exam
  @Expose() @ApiPropertyOptional({ description: '[EXAM] Tipo de exame', example: 'hemograma' })
  examType?: string;

  @Expose() @ApiPropertyOptional({ description: '[EXAM] Resultado do exame', example: 'Eritrócitos 4,5 M/μL — dentro dos limites normais.' })
  result?: string;

  // FollowUp
  @Expose() @ApiPropertyOptional({ description: '[FOLLOW_UP] ID do atendimento que originou este retorno', example: 3 })
  originAppointmentId?: number;

  @Expose() @ApiPropertyOptional({ description: '[FOLLOW_UP] Evolução clínica', example: 'Pressão arterial estabilizada com medicação.' })
  clinicalEvolution?: string;

  @Expose() @ApiProperty({ example: '2026-06-07T09:00:00.000Z' })
  createdAt: Date;

  @Expose() @ApiProperty({ example: '2026-06-07T09:00:00.000Z' })
  updatedAt: Date;
}
