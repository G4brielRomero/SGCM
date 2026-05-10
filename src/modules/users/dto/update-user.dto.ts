import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsCpf } from '../../../common/decorators/is-cpf.decorator';

// type não pode ser alterado após o cadastro (paciente não vira médico)
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Rafael Mendes Atualizado' })
  @IsOptional()
  @IsNotEmpty({ message: 'Nome não pode ser vazio' })
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
  @IsNotEmpty({ message: 'CRM não pode ser vazio' })
  @IsString()
  crm?: string;

  // Campos do Patient
  @ApiPropertyOptional({ example: '123.456.789-09' })
  @IsOptional()
  @IsCpf({ message: 'CPF inválido. Certifique-se de que os dígitos verificadores estão corretos.' })
  cpf?: string;

  @ApiPropertyOptional({ example: '1985-03-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
