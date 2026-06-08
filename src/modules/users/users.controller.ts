import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ProblemDetailDto } from '../../common/dto/problem-detail.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindDoctorsQueryDto, FindUsersQueryDto } from './dto/find-users-query.dto';
import { DoctorResponseDto, PatientResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UserType } from './entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/types/user-payload.interface';
import { ApiEnvelopeResponse, ApiPaginatedResponse, ApiUnauthorizedResponse } from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth('access-token')
@ApiTags('Users')
@ApiUnauthorizedResponse()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar usuário',
    description: 'Apenas ADMIN pode criar usuários.',
  })
  @ApiEnvelopeResponse(UserResponseDto, 201, 'Usuário criado.')
  @ApiResponse({ status: 400, description: 'Dados inválidos.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode criar usuários.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'E-mail, CRM ou CPF já cadastrado.', type: ProblemDetailDto })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.serialize(user);
  }

  @Get()
  @Roles(UserType.ADMIN)
  @ApiOperation({
    summary: 'Listar usuários',
    description: 'Apenas ADMIN pode listar todos os usuários.',
  })
  @ApiPaginatedResponse(UserResponseDto, 'Lista paginada de usuários.')
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode listar usuários.', type: ProblemDetailDto })
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findAll(query);

    return {
      ...result,
      data: result.data.map((u) => this.serialize(u)),
    };
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', description: 'ID do usuário', example: 1 })
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: 'ADMIN pode buscar qualquer usuário. DOCTOR e PATIENT só podem buscar o próprio usuário.',
  })
  @ApiEnvelopeResponse(UserResponseDto, 200, 'Usuário encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este usuário.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const user = await this.usersService.findOne(id, currentUser);
    return this.serialize(user);
  }

  @Put(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar usuário',
    description: 'ADMIN pode atualizar qualquer usuário. DOCTOR e PATIENT só podem atualizar o próprio usuário.',
  })
  @ApiEnvelopeResponse(UserResponseDto, 200, 'Usuário atualizado.')
  @ApiResponse({ status: 400, description: 'Dados inválidos.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para atualizar este usuário.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'E-mail, CRM ou CPF já em uso.', type: ProblemDetailDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const user = await this.usersService.update(id, dto, currentUser);
    return this.serialize(user);
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Inativar usuário',
    description: 'Apenas ADMIN pode inativar usuários.',
  })
  @ApiResponse({ status: 204, description: 'Usuário inativado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Administrador não pode inativar a própria conta.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Usuário possui agendamentos ativos.', type: ProblemDetailDto })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    await this.usersService.remove(id, currentUser);
  }

  private serialize(user: any) {
    if (user.type === UserType.DOCTOR) {
      return plainToInstance(DoctorResponseDto, user, {
        excludeExtraneousValues: true,
      });
    }

    if (user.type === UserType.PATIENT) {
      return plainToInstance(PatientResponseDto, user, {
        excludeExtraneousValues: true,
      });
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}

@ApiBearerAuth('access-token')
@ApiTags('Doctors')
@ApiUnauthorizedResponse()
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Listar médicos',
    description: 'Qualquer usuário autenticado pode visualizar médicos.',
  })
  @ApiPaginatedResponse(DoctorResponseDto, 'Lista paginada de médicos com especialidades.')
  async findAll(@Query() query: FindDoctorsQueryDto) {
    const result = await this.usersService.findAllDoctors(query);

    return {
      ...result,
      data: result.data.map((d) =>
        plainToInstance(DoctorResponseDto, d, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Buscar médico por ID',
    description: 'Qualquer usuário autenticado pode visualizar o perfil de um médico.',
  })
  @ApiEnvelopeResponse(DoctorResponseDto, 200, 'Médico encontrado.')
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const doctor = await this.usersService.findDoctor(id);

    return plainToInstance(DoctorResponseDto, doctor, {
      excludeExtraneousValues: true,
    });
  }
}

@ApiBearerAuth('access-token')
@ApiTags('Patients')
@ApiUnauthorizedResponse()
@Controller('patients')
export class PatientsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR)
  @ApiOperation({
    summary: 'Listar pacientes',
    description: 'Apenas ADMIN e DOCTOR podem listar pacientes.',
  })
  @ApiPaginatedResponse(PatientResponseDto, 'Lista paginada de pacientes.')
  async findAll(@Query() query: FindUsersQueryDto) {
    const result = await this.usersService.findAllPatients(query);

    return {
      ...result,
      data: result.data.map((p) =>
        plainToInstance(PatientResponseDto, p, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 2 })
  @ApiOperation({
    summary: 'Buscar paciente por ID',
    description: 'ADMIN e DOCTOR podem consultar pacientes. PATIENT só pode consultar o próprio cadastro.',
  })
  @ApiEnvelopeResponse(PatientResponseDto, 200, 'Paciente encontrado.')
  @ApiResponse({ status: 403, description: 'Sem permissão para acessar este paciente.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Paciente não encontrado.', type: ProblemDetailDto })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: UserPayload,
  ) {
    const patient = await this.usersService.findPatient(id, currentUser);

    return plainToInstance(PatientResponseDto, patient, {
      excludeExtraneousValues: true,
    });
  }
}