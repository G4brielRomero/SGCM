import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { UserType } from '../entities/user.entity';

export class FindUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserType, description: 'Filtrar por tipo de usuário' })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;
}

export class FindDoctorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por especialidade', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  specialtyId?: number;
}