import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '../entities/user.entity';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Rafael Mendes' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'rafael@clinica.com' })
  email: string;

  @Expose()
  @ApiProperty({ enum: UserType, example: UserType.DOCTOR })
  type: UserType;

  @Expose()
  @ApiProperty({ example: true })
  isActive: boolean;

  @Expose()
  @ApiProperty({ example: '2026-01-01T10:00:00.000Z' })
  createdAt: Date;

  // password e refreshToken omitidos intencionalmente
}

@Exclude()
export class DoctorResponseDto extends UserResponseDto {
  @Expose()
  @ApiPropertyOptional({ example: '12345-SP' })
  crm: string;

  @Expose()
  @ApiPropertyOptional({ type: () => [SpecialtyEmbedDto] })
  @Type(() => SpecialtyEmbedDto)
  specialties: SpecialtyEmbedDto[];
}

@Exclude()
export class PatientResponseDto extends UserResponseDto {
  @Expose()
  @ApiPropertyOptional({ example: '123.456.789-09' })
  cpf: string;

  @Expose()
  @ApiPropertyOptional({ example: '1990-06-15' })
  birthDate: string;
}

// Embed leve usado dentro de DoctorResponseDto para evitar circular dependency
@Exclude()
export class SpecialtyEmbedDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Cardiologia' })
  name: string;
}
