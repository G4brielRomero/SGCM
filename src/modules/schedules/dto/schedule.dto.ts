import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { ScheduleStatus, ScheduleType } from '../entities/schedule.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Data e hora do agendamento (ISO 8601, deve ser futura)',
    example: '2026-12-10T09:00:00.000Z',
  })
  @IsDateString({}, { message: 'scheduledAt deve ser uma data válida no formato ISO 8601' })
  scheduledAt: string;

  @ApiProperty({ description: 'ID do médico', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'doctorId deve ser um número inteiro' })
  @IsPositive({ message: 'doctorId deve ser um número positivo' })
  doctorId: number;

  @ApiPropertyOptional({ description: 'ID do paciente (obrigatório para ADMIN; preenchido automaticamente para PATIENT)', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'patientId deve ser um número inteiro' })
  @IsPositive({ message: 'patientId deve ser um número positivo' })
  patientId?: number;

  @ApiProperty({
    enum: ScheduleType,
    description: 'Modalidade do agendamento',
    example: ScheduleType.IN_PERSON,
  })
  @IsEnum(ScheduleType, { message: 'type deve ser IN_PERSON, ONLINE ou HOME' })
  type: ScheduleType;

  @ApiPropertyOptional({ description: 'Sala (obrigatório para IN_PERSON)', example: '102' })
  @ValidateIf((o) => o.type === ScheduleType.IN_PERSON)
  @IsNotEmpty({ message: 'room é obrigatório para agendamentos presenciais' })
  @IsString()
  room?: string;

  @ApiPropertyOptional({ description: 'Unidade (obrigatório para IN_PERSON)', example: 'Unidade Central' })
  @ValidateIf((o) => o.type === ScheduleType.IN_PERSON)
  @IsNotEmpty({ message: 'unit é obrigatório para agendamentos presenciais' })
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Link de acesso (obrigatório para ONLINE)',
    example: 'https://meet.google.com/abc-def',
  })
  @ValidateIf((o) => o.type === ScheduleType.ONLINE)
  @IsNotEmpty({ message: 'accessLink é obrigatório para agendamentos online' })
  @IsString()
  accessLink?: string;

  @ApiPropertyOptional({ description: 'Plataforma (obrigatório para ONLINE)', example: 'Google Meet' })
  @ValidateIf((o) => o.type === ScheduleType.ONLINE)
  @IsNotEmpty({ message: 'platform é obrigatório para agendamentos online' })
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: 'Endereço completo (obrigatório para HOME)',
    example: 'Rua das Flores, 123, São Paulo - SP',
  })
  @ValidateIf((o) => o.type === ScheduleType.HOME)
  @IsNotEmpty({ message: 'fullAddress é obrigatório para agendamentos domiciliares' })
  @IsString()
  fullAddress?: string;

  @ApiPropertyOptional({
    description: 'Observações de acesso (opcional para HOME)',
    example: 'Portão azul, tocar campainha.',
  })
  @ValidateIf((o) => o.type === ScheduleType.HOME)
  @IsOptional()
  @IsString()
  accessNotes?: string;

  @ApiPropertyOptional({
    description: 'Motivo do cancelamento (usado ao cancelar)',
    example: 'Paciente desmarcou.',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class UpdateScheduleStatusDto {
  @ApiProperty({
    enum: [ScheduleStatus.CONFIRMED, ScheduleStatus.CANCELLED],
    description: 'Novo status. COMPLETED não é aceito diretamente — ocorre via Appointments na Etapa 3.',
    example: ScheduleStatus.CONFIRMED,
  })
  @IsEnum([ScheduleStatus.CONFIRMED, ScheduleStatus.CANCELLED], {
    message: 'status deve ser CONFIRMED ou CANCELLED. COMPLETED não é permitido neste endpoint.',
  })
  status: ScheduleStatus.CONFIRMED | ScheduleStatus.CANCELLED;

  @ApiPropertyOptional({
    description: 'Motivo do cancelamento (recomendado ao cancelar)',
    example: 'Médico indisponível.',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class FindSchedulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  doctorId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  patientId?: number;

  @ApiPropertyOptional({ enum: ScheduleStatus, example: ScheduleStatus.CONFIRMED })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ enum: ScheduleType, example: ScheduleType.IN_PERSON })
  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

@Exclude()
export class ScheduleResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: '2026-12-10T09:00:00.000Z' })
  scheduledAt: Date;

  @Expose()
  @ApiProperty({ enum: ScheduleStatus })
  status: ScheduleStatus;

  @Expose()
  @ApiProperty({ enum: ScheduleType })
  type: ScheduleType;

  @Expose()
  @ApiProperty({ example: 1 })
  doctorId: number;

  @Expose()
  @ApiProperty({ example: 2 })
  patientId: number;

  @Expose()
  @ApiPropertyOptional({ example: '102' })
  room?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Unidade Central' })
  unit?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'https://meet.google.com/abc' })
  accessLink?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Google Meet' })
  platform?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Rua das Flores, 123' })
  fullAddress?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Portão azul' })
  accessNotes?: string;

  @Expose()
  @ApiPropertyOptional({ example: null })
  cancelledAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: null })
  cancellationReason?: string;

  @Expose()
  @ApiPropertyOptional({ example: 1 })
  createdBy?: number;

  @Expose()
  @ApiPropertyOptional({ example: null })
  cancelledBy?: number;

  @Expose()
  @ApiProperty({ example: '2026-01-01T10:00:00.000Z' })
  createdAt: Date;
}