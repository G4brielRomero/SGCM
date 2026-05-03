import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

// type não pode ser alterado após o cadastro (paciente não vira médico)
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Rafael Mendes Atualizado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'novo@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail deve ter formato válido' })
  email?: string;

  @ApiPropertyOptional({ example: 'novaSenha@456' })
  @IsOptional()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  password?: string;

  // Campos do Doctor
  @ApiPropertyOptional({ example: '99999-RJ' })
  @IsOptional()
  @IsString()
  crm?: string;

  // Campos do Patient
  @ApiPropertyOptional({ example: '111.222.333-44' })
  @IsOptional()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, {
    message: 'CPF deve estar no formato 000.000.000-00 ou 11 dígitos numéricos',
  })
  cpf?: string;

  @ApiPropertyOptional({ example: '1985-03-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
