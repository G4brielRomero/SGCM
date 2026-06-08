import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Expose } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ProcedureType } from '../entities/procedure.entity';
import { AuthorizationStatus, ComplexityLevel } from '../entities/specialized-procedure.entity';

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateProcedureDto {
  @ApiProperty({ example: 'Eletrocardiograma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Registro da atividade elétrica do coração.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ProcedureType, example: ProcedureType.SIMPLE })
  @IsEnum(ProcedureType)
  type: ProcedureType;

  // SimpleProcedure
  @ApiPropertyOptional({ example: 30, description: 'Duração estimada em minutos (SIMPLE)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  estimatedDuration?: number;

  // SpecializedProcedure
  @ApiPropertyOptional({ example: 'Eletrocardiógrafo digital' })
  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @ApiPropertyOptional({ enum: ComplexityLevel, example: ComplexityLevel.MEDIUM })
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresAuthorization?: boolean;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdateProcedureDto {
  @ApiPropertyOptional({ example: 'ECG com Mapeamento de 12 Derivações' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Duração revisada após análise do quadro clínico do paciente.' })
  @IsOptional()
  @IsString()
  description?: string;

  // SimpleProcedure
  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  estimatedDuration?: number;

  // SpecializedProcedure
  @ApiPropertyOptional({ example: 'Eletrocardiógrafo digital de 12 derivações' })
  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @ApiPropertyOptional({ enum: ComplexityLevel, example: ComplexityLevel.HIGH })
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;
}

// ─── Deny (legacy — usado internamente) ──────────────────────────────────────

export class DenyProcedureDto {
  @ApiPropertyOptional({ example: 'Equipamento indisponível no momento.' })
  @IsOptional()
  @IsString()
  deniedReason?: string;
}

// ─── Authorization (PATCH /procedures/{id}/authorization) ────────────────────

export class AuthorizeProcedureDto {
  @ApiProperty({ enum: ['AUTHORIZE', 'DENY'], example: 'AUTHORIZE', description: 'Ação de autorização: AUTHORIZE ou DENY.' })
  @IsEnum(['AUTHORIZE', 'DENY'])
  action: 'AUTHORIZE' | 'DENY';

  @ApiPropertyOptional({ example: 'Equipamento indisponível no momento.', description: 'Motivo da negação (obrigatório quando action=DENY).' })
  @IsOptional()
  @IsString()
  deniedReason?: string;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export class FindProceduresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProcedureType })
  @IsOptional()
  @IsEnum(ProcedureType)
  type?: ProcedureType;

  @ApiPropertyOptional({ enum: AuthorizationStatus })
  @IsOptional()
  @IsEnum(AuthorizationStatus)
  authorizationStatus?: AuthorizationStatus;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export class ProcedureResponseDto {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() description: string;
  @Expose() appointmentId: number;
  @Expose() type: ProcedureType;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  // SimpleProcedure
  @Expose() estimatedDuration?: number;

  // SpecializedProcedure
  @Expose() requiredEquipment?: string;
  @Expose() complexityLevel?: ComplexityLevel;
  @Expose() requiresAuthorization?: boolean;
  @Expose() authorizationStatus?: AuthorizationStatus;
  @Expose() authorizedBy?: number;
  @Expose() authorizedAt?: Date;
  @Expose() deniedReason?: string;
}
