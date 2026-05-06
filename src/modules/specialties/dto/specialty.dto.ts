import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class CreateSpecialtyDto {
  @ApiProperty({
    description: 'Nome único da especialidade',
    example: 'Cardiologia',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Descrição da especialidade',
    example: 'Especialidade voltada ao coração e sistema cardiovascular.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;
}

export class UpdateSpecialtyDto extends PartialType(CreateSpecialtyDto) {}

@Exclude()
export class SpecialtyResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'Cardiologia' })
  name: string;

  @Expose()
  @ApiProperty({
    example: 'Especialidade voltada ao coração e sistema cardiovascular.',
  })
  description: string;

  @Expose()
  @ApiProperty({ example: '2026-01-01T10:00:00.000Z' })
  createdAt: Date;
}

export class AssociateSpecialtyDto {
  @ApiProperty({ description: 'ID da especialidade a associar', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  specialtyId: number;
}