import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type, Expose } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// ─── Create ───────────────────────────────────────────────────────────────────

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  appointmentId: number;

  @ApiProperty({ example: 'Hipertensão arterial sistêmica leve.' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiPropertyOptional({ example: 'Losartana 50mg — 1x ao dia.' })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiPropertyOptional({ example: 'Paciente orientado sobre dieta hipossódica.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({ example: 'Losartana 25mg — 1x ao dia.' })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiPropertyOptional({ example: 'Retorno em 30 dias.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export class FindMedicalRecordsQueryDto extends PaginationQueryDto {}

// ─── Response ─────────────────────────────────────────────────────────────────

export class MedicalRecordResponseDto {
  @Expose() id: number;
  @Expose() appointmentId: number;
  @Expose() doctorId: number;
  @Expose() patientId: number;
  @Expose() diagnosis: string;
  @Expose() prescription: string | null;
  @Expose() notes: string | null;
  @Expose() lastUpdatedBy: number | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
