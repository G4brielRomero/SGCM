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
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto, SpecialtyResponseDto, UpdateSpecialtyDto } from './dto/specialty.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AssociateSpecialtyDto } from './dto/specialty.dto';
import { DoctorResponseDto } from '../users/dto/user-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserType } from '../users/entities/user.entity';
import { ApiEnvelopeResponse, ApiPaginatedResponse, ApiUnauthorizedResponse } from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth('access-token')
@ApiTags('Specialties')
@ApiUnauthorizedResponse()
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Post()
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar especialidade',
    description: 'Apenas ADMIN pode criar especialidades.',
  })
  @ApiEnvelopeResponse(SpecialtyResponseDto, 201, 'Especialidade criada.')
  @ApiResponse({ status: 400, description: 'Dados inválidos.', type: ProblemDetailDto })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode criar especialidades.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Nome já cadastrado.', type: ProblemDetailDto })
  async create(@Body() dto: CreateSpecialtyDto) {
    const s = await this.specialtiesService.create(dto);

    return plainToInstance(SpecialtyResponseDto, s, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiOperation({
    summary: 'Listar especialidades',
    description: 'Qualquer usuário autenticado pode listar especialidades.',
  })
  @ApiPaginatedResponse(SpecialtyResponseDto, 'Lista paginada de especialidades.')
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.specialtiesService.findAll(query);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(SpecialtyResponseDto, s, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Get(':id')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Buscar especialidade por ID',
    description: 'Qualquer usuário autenticado pode buscar uma especialidade.',
  })
  @ApiEnvelopeResponse(SpecialtyResponseDto, 200, 'Especialidade encontrada.')
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.', type: ProblemDetailDto })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const s = await this.specialtiesService.findOne(id);

    return plainToInstance(SpecialtyResponseDto, s, {
      excludeExtraneousValues: true,
    });
  }

  @Put(':id')
  @Roles(UserType.ADMIN)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Atualizar especialidade',
    description: 'Apenas ADMIN pode atualizar especialidades.',
  })
  @ApiEnvelopeResponse(SpecialtyResponseDto, 200, 'Especialidade atualizada.')
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode atualizar especialidades.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Nome já em uso.', type: ProblemDetailDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSpecialtyDto) {
    const s = await this.specialtiesService.update(id, dto);

    return plainToInstance(SpecialtyResponseDto, s, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Excluir especialidade',
    description: 'Apenas ADMIN pode excluir especialidades.',
  })
  @ApiResponse({ status: 204, description: 'Especialidade excluída com sucesso.' })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode excluir especialidades.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Especialidade possui médicos associados.', type: ProblemDetailDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.specialtiesService.remove(id);
  }

  @Get(':id/doctors')
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'id', example: 1 })
  @ApiOperation({
    summary: 'Listar médicos de uma especialidade',
    description: 'Qualquer usuário autenticado pode visualizar médicos por especialidade.',
  })
  @ApiPaginatedResponse(DoctorResponseDto, 'Lista paginada de médicos da especialidade.')
  @ApiResponse({ status: 404, description: 'Especialidade não encontrada.', type: ProblemDetailDto })
  async findDoctors(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQueryDto) {
    const result = await this.specialtiesService.findDoctorsBySpecialty(id, query);

    return {
      ...result,
      data: result.data.map((d) =>
        plainToInstance(DoctorResponseDto, d, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }
}

@ApiBearerAuth('access-token')
@ApiTags('Doctors')
@ApiUnauthorizedResponse()
@Controller('doctors/:doctorId/specialties')
export class DoctorSpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  @Roles(UserType.ADMIN, UserType.DOCTOR, UserType.PATIENT)
  @ApiParam({ name: 'doctorId', example: 1 })
  @ApiOperation({
    summary: 'Listar especialidades de um médico',
    description: 'Qualquer usuário autenticado pode visualizar especialidades de médicos.',
  })
  @ApiPaginatedResponse(SpecialtyResponseDto, 'Lista paginada de especialidades do médico.')
  @ApiResponse({ status: 404, description: 'Médico não encontrado.', type: ProblemDetailDto })
  async findAll(@Param('doctorId', ParseIntPipe) doctorId: number, @Query() query: PaginationQueryDto) {
    const result = await this.specialtiesService.findDoctorSpecialties(doctorId, query);

    return {
      ...result,
      data: result.data.map((s) =>
        plainToInstance(SpecialtyResponseDto, s, {
          excludeExtraneousValues: true,
        }),
      ),
    };
  }

  @Post()
  @Roles(UserType.ADMIN)
  @ApiParam({ name: 'doctorId', example: 1 })
  @ApiOperation({
    summary: 'Associar especialidade a um médico',
    description: 'Apenas ADMIN pode associar especialidades a médicos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Especialidade associada com sucesso.',
    content: {
      'application/json': {
        schema: {
          example: {
            data: { message: 'Especialidade associada com sucesso.' },
            meta: { timestamp: '2026-06-07T09:00:00.000Z', path: '/doctors/1/specialties' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode associar especialidades a médicos.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico ou especialidade não encontrado.', type: ProblemDetailDto })
  @ApiResponse({ status: 409, description: 'Médico já possui a especialidade.', type: ProblemDetailDto })
  async associate(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Body() dto: AssociateSpecialtyDto,
  ) {
    await this.specialtiesService.associateDoctor(doctorId, dto.specialtyId);

    return { message: 'Especialidade associada com sucesso.' };
  }

  @Delete(':specialtyId')
  @Roles(UserType.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'doctorId', example: 1 })
  @ApiParam({ name: 'specialtyId', example: 1 })
  @ApiOperation({
    summary: 'Desassociar especialidade de um médico',
    description: 'Apenas ADMIN pode desassociar especialidades de médicos.',
  })
  @ApiResponse({ status: 204, description: 'Especialidade desassociada com sucesso.' })
  @ApiResponse({ status: 403, description: 'Apenas ADMIN pode desassociar especialidades de médicos.', type: ProblemDetailDto })
  @ApiResponse({ status: 404, description: 'Médico ou especialidade não encontrado.', type: ProblemDetailDto })
  async dissociate(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Param('specialtyId', ParseIntPipe) specialtyId: number,
  ) {
    await this.specialtiesService.dissociateDoctor(doctorId, specialtyId);
  }
}