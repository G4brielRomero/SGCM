import {
  Controller, Get, Post, Body, Param, Delete, Put, Query,
  HttpCode, HttpStatus, ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiParam,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindDoctorsQueryDto, FindUsersQueryDto } from './dto/find-users-query.dto';
import { DoctorResponseDto, PatientResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UserType } from './entities/user.entity';

// Controller geral para operações comuns de usuários
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar usuário', description: 'Cria um usuário de qualquer perfil. Campos extras são exigidos conforme o tipo.' })
  @ApiResponse({ status: 201, description: 'Usuário criado.', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 409, description: 'E-mail, CRM ou CPF já cadastrado.' })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.serialize(user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuários', description: 'Retorna lista paginada. Filtre por type para restringir o perfil.' })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuários.' })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findAll(query);

    // Serializa cada usuário conforme seu tipo
    return { ...result, data: result.data.map((u) => this.serialize(u)) };
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID do usuário', example: 1 })
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    return this.serialize(user);
  }

  @Put(':id')
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @ApiResponse({ status: 409, description: 'E-mail, CRM ou CPF já em uso.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return this.serialize(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({ summary: 'Inativar usuário', description: 'Realiza inativação lógica. Usuários com agendamentos ativos não podem ser removidos.' })
  @ApiResponse({ status: 204, description: 'Usuário inativado.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @ApiResponse({ status: 409, description: 'Usuário possui agendamentos ativos.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
  }

  private serialize(user: any) {
    // Escolhe o DTO de resposta correto para evitar expor campos indevidos
    if (user.type === UserType.DOCTOR) {
      return plainToInstance(DoctorResponseDto, user, { excludeExtraneousValues: true });
    }

    if (user.type === UserType.PATIENT) {
      return plainToInstance(PatientResponseDto, user, { excludeExtraneousValues: true });
    }

    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }
}

// Controller específico para consultas de médicos
@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar médicos', description: 'Retorna médicos com especialidades. Filtre por specialtyId ou nome.' })
  @ApiResponse({ status: 200, description: 'Lista paginada de médicos com especialidades.' })
  async findAll(@Query() query: FindDoctorsQueryDto) {
    const result = await this.usersService.findAllDoctors(query);

    // Mantém a paginação e converte apenas os dados retornados
    return {
      ...result,
      data: result.data.map((d) =>
        plainToInstance(DoctorResponseDto, d, { excludeExtraneousValues: true }),
      ),
    };
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({ summary: 'Buscar médico por ID', description: 'Retorna o médico com suas especialidades.' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({ status: 404, description: 'Médico não encontrado.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const doctor = await this.usersService.findDoctor(id);
    return plainToInstance(DoctorResponseDto, doctor, { excludeExtraneousValues: true });
  }
}

// Controller específico para consultas de pacientes
@ApiTags('Patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pacientes' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pacientes.' })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findAllPatients(query);

    // Mantém a paginação e aplica o DTO de resposta
    return {
      ...result,
      data: result.data.map((p) =>
        plainToInstance(PatientResponseDto, p, { excludeExtraneousValues: true }),
      ),
    };
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 2 })
  @ApiOperation({ summary: 'Buscar paciente por ID' })
  @ApiResponse({ status: 200, type: PatientResponseDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const patient = await this.usersService.findPatient(id);
    return plainToInstance(PatientResponseDto, patient, { excludeExtraneousValues: true });
  }
}