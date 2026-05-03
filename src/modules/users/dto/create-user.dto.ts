import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'Nome completo do usuário', example: 'Rafael Mendes' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'E-mail único no sistema', example: 'rafael@clinica.com' })
  @IsEmail({}, { message: 'E-mail deve ter formato válido' })
  email: string;

  @ApiProperty({ description: 'Senha (mínimo 8 caracteres)', example: 'senha@123' })
  @IsNotEmpty()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  password: string;

  @ApiProperty({ enum: UserType, description: 'Perfil do usuário', example: UserType.DOCTOR })
  @IsEnum(UserType, { message: 'Tipo deve ser ADMIN, DOCTOR ou PATIENT' })
  type: UserType;

  // Campos do Doctor
  @ApiPropertyOptional({ description: 'CRM do médico (obrigatório para DOCTOR)', example: '12345-SP' })
  @ValidateIf((o) => o.type === UserType.DOCTOR)
  @IsNotEmpty({ message: 'CRM é obrigatório para médicos' })
  @IsString()
  crm?: string;

  // Campos do Patient
  @ApiPropertyOptional({ description: 'CPF do paciente (obrigatório para PATIENT)', example: '123.456.789-09' })
  @ValidateIf((o) => o.type === UserType.PATIENT)
  @IsNotEmpty({ message: 'CPF é obrigatório para pacientes' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, {
    message: 'CPF deve estar no formato 000.000.000-00 ou 11 dígitos numéricos',
  })
  cpf?: string;

  @ApiPropertyOptional({ description: 'Data de nascimento (obrigatória para PATIENT)', example: '1990-06-15' })
  @ValidateIf((o) => o.type === UserType.PATIENT)
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória para pacientes' })
  @IsDateString({}, { message: 'Data de nascimento deve estar no formato ISO 8601' })
  birthDate?: string;
}
