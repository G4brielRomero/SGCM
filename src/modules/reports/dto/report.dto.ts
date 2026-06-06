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
  @Expose() id: number;
  @Expose() appointmentId: number;
  @Expose() doctorId: number;
  @Expose() patientId: number;
  @Expose() validationCode: string;
  @Expose() status: ReportStatus;
  @Expose() issuedAt: Date;
  @Expose() issuedBy: number;
  @Expose() revokedAt: Date | null;
  @Expose() revokedBy: number | null;
  @Expose() revokedReason: string | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

export class PublicReportValidationDto {
  @Expose() validationCode: string;
  @Expose() status: ReportStatus;
  @Expose() issuedAt: Date;
  @Expose() patientName: string;
  @Expose() doctorName: string;
  @Expose() examType: string;
  @Expose() revokedAt?: Date | null;
  @Expose() revokedReason?: string | null;
}