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

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  appointmentId: number;

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
  @ApiPropertyOptional({ example: 'Eletrocardiograma revisado' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada.' })
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
  @ApiPropertyOptional({ example: 'Novo equipamento' })
  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @ApiPropertyOptional({ enum: ComplexityLevel })
  @IsOptional()
  @IsEnum(ComplexityLevel)
  complexityLevel?: ComplexityLevel;
}

// ─── Deny ─────────────────────────────────────────────────────────────────────

export class DenyProcedureDto {
  @ApiPropertyOptional({ example: 'Equipamento indisponível no momento.' })
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
