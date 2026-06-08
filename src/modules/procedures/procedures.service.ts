import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Procedure, ProcedureType } from './entities/procedure.entity';
import { SimpleProcedure } from './entities/simple-procedure.entity';
import {
  AuthorizationStatus,
  SpecializedProcedure,
} from './entities/specialized-procedure.entity';
import {
  CreateProcedureDto,
  DenyProcedureDto,
  FindProceduresQueryDto,
  UpdateProcedureDto,
} from './dto/procedure.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';
import { paginate, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class ProceduresService {
  constructor(
    @InjectRepository(Procedure)
    private readonly procedureRepository: Repository<Procedure>,

    @InjectRepository(SimpleProcedure)
    private readonly simpleProcedureRepository: Repository<SimpleProcedure>,

    @InjectRepository(SpecializedProcedure)
    private readonly specializedProcedureRepository: Repository<SpecializedProcedure>,

    private readonly appointmentsService: AppointmentsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────

  async create(dto: CreateProcedureDto, appointmentId: number, currentUser: UserPayload): Promise<Procedure> {
    const appointment = await this.appointmentsService.findOneInternal(appointmentId);

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Procedimentos só podem ser adicionados a atendimentos IN_PROGRESS. Status atual: ${appointment.status}.`,
      );
    }

    if (currentUser.type === UserType.DOCTOR && appointment.doctorId !== currentUser.sub) {
      throw new ForbiddenException('Você só pode adicionar procedimentos aos seus próprios atendimentos.');
    }

    this.validateTypeSpecificFields(dto);

    if (dto.type === ProcedureType.SIMPLE) {
      const entity = this.simpleProcedureRepository.create({
        name: dto.name,
        description: dto.description,
        appointmentId,
        estimatedDuration: dto.estimatedDuration!,
      });
      return this.simpleProcedureRepository.save(entity);
    } else {
      const requiresAuth = dto.requiresAuthorization ?? false;
      const entity = this.specializedProcedureRepository.create({
        name: dto.name,
        description: dto.description,
        appointmentId,
        requiredEquipment: dto.requiredEquipment!,
        complexityLevel: dto.complexityLevel!,
        requiresAuthorization: requiresAuth,
        authorizationStatus: requiresAuth ? AuthorizationStatus.PENDING : null,
        authorizedBy: null,
        authorizedAt: null,
        deniedReason: null,
      });
      return this.specializedProcedureRepository.save(entity);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // FIND ALL BY APPOINTMENT
  // ─────────────────────────────────────────────────────────────────────

  async findByAppointment(
    appointmentId: number,
    query: FindProceduresQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<Procedure>> {
    const appointment = await this.appointmentsService.findOneInternal(appointmentId);
    this.ensureCanAccess(appointment, currentUser);

    const { page = 1, limit = 20, sort, type, authorizationStatus } = query;

    const qb = this.procedureRepository
      .createQueryBuilder('procedure')
      .where('procedure.appointmentId = :appointmentId', { appointmentId });

    if (type) qb.andWhere('procedure.type = :type', { type });
    if (authorizationStatus) {
      qb.andWhere('procedure.authorizationStatus = :authorizationStatus', { authorizationStatus });
    }

    const sortField = ['createdAt', 'name', 'type'].includes(sort?.split(':')[0] ?? '')
      ? sort!.split(':')[0]
      : 'createdAt';
    const sortDir = sort?.split(':')[1]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(`procedure.${sortField}`, sortDir as 'ASC' | 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────────────────

  async findOne(id: number, currentUser: UserPayload): Promise<Procedure> {
    const procedure = await this.procedureRepository.findOne({ where: { id } });
    if (!procedure) {
      throw new NotFoundException(`Procedimento com id ${id} não encontrado.`);
    }

    const appointment = await this.appointmentsService.findOneInternal(procedure.appointmentId);
    this.ensureCanAccess(appointment, currentUser);

    return procedure;
  }

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateProcedureDto, currentUser: UserPayload): Promise<Procedure> {
    const procedure = await this.findOne(id, currentUser);
    const appointment = await this.appointmentsService.findOneInternal(procedure.appointmentId);

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Procedimentos de atendimentos encerrados não podem ser atualizados.',
      );
    }

    if (dto.name !== undefined) procedure.name = dto.name;
    if (dto.description !== undefined) procedure.description = dto.description;

    if (procedure.type === ProcedureType.SIMPLE) {
      const simple = procedure as SimpleProcedure;
      if (dto.estimatedDuration !== undefined) simple.estimatedDuration = dto.estimatedDuration;
    } else {
      const specialized = procedure as SpecializedProcedure;
      if (dto.requiredEquipment !== undefined) specialized.requiredEquipment = dto.requiredEquipment;
      if (dto.complexityLevel !== undefined) specialized.complexityLevel = dto.complexityLevel;
    }

    return this.procedureRepository.save(procedure);
  }

  // ─────────────────────────────────────────────────────────────────────
  // AUTHORIZE
  // ─────────────────────────────────────────────────────────────────────

  async authorize(id: number, currentUser: UserPayload): Promise<SpecializedProcedure> {
    const procedure = await this.findSpecializedOrFail(id);

    if (!procedure.requiresAuthorization) {
      throw new BadRequestException('Este procedimento não requer autorização.');
    }

    if (procedure.authorizationStatus !== AuthorizationStatus.PENDING) {
      throw new BadRequestException(
        `Apenas procedimentos PENDING podem ser autorizados. Status atual: ${procedure.authorizationStatus}.`,
      );
    }

    procedure.authorizationStatus = AuthorizationStatus.AUTHORIZED;
    procedure.authorizedBy = currentUser.sub;
    procedure.authorizedAt = new Date();

    return this.specializedProcedureRepository.save(procedure);
  }

  // ─────────────────────────────────────────────────────────────────────
  // DENY
  // ─────────────────────────────────────────────────────────────────────

  async deny(id: number, dto: DenyProcedureDto, currentUser: UserPayload): Promise<SpecializedProcedure> {
    const procedure = await this.findSpecializedOrFail(id);

    if (!procedure.requiresAuthorization) {
      throw new BadRequestException('Este procedimento não requer autorização.');
    }

    if (procedure.authorizationStatus === AuthorizationStatus.DENIED) {
      throw new BadRequestException('Este procedimento já foi negado. A negação é definitiva.');
    }

    if (procedure.authorizationStatus !== AuthorizationStatus.PENDING) {
      throw new BadRequestException(
        `Apenas procedimentos PENDING podem ser negados. Status atual: ${procedure.authorizationStatus}.`,
      );
    }

    procedure.authorizationStatus = AuthorizationStatus.DENIED;
    procedure.deniedReason = dto.deniedReason ?? null;

    return this.specializedProcedureRepository.save(procedure);
  }

  // ─────────────────────────────────────────────────────────────────────
  // REMOVE
  // ─────────────────────────────────────────────────────────────────────

  async remove(id: number, currentUser: UserPayload): Promise<void> {
    const procedure = await this.findOne(id, currentUser);
    const appointment = await this.appointmentsService.findOneInternal(procedure.appointmentId);

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Procedimentos de atendimentos encerrados não podem ser removidos.',
      );
    }

    await this.procedureRepository.remove(procedure);
  }

  // ─────────────────────────────────────────────────────────────────────
  // INTERNAL / AGGREGATION (usado pelo AdminModule)
  // ─────────────────────────────────────────────────────────────────────

  async countByType(): Promise<{ type: string; count: number }[]> {
    return this.procedureRepository
      .createQueryBuilder('p')
      .select('p.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.type')
      .getRawMany();
  }

  async countByAuthorizationStatus(): Promise<{ authorizationStatus: string; count: number }[]> {
    return this.specializedProcedureRepository
      .createQueryBuilder('p')
      .select('p.authorizationStatus', 'authorizationStatus')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.authorizationStatus')
      .getRawMany();
  }

  // ─────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────

  private validateTypeSpecificFields(dto: CreateProcedureDto): void {
    if (dto.type === ProcedureType.SIMPLE) {
      if (!dto.estimatedDuration) {
        throw new BadRequestException('O campo estimatedDuration é obrigatório para procedimentos do tipo SIMPLE.');
      }
    } else {
      if (!dto.requiredEquipment) {
        throw new BadRequestException('O campo requiredEquipment é obrigatório para procedimentos do tipo SPECIALIZED.');
      }
      if (!dto.complexityLevel) {
        throw new BadRequestException('O campo complexityLevel é obrigatório para procedimentos do tipo SPECIALIZED.');
      }
    }
  }

  private async findSpecializedOrFail(id: number): Promise<SpecializedProcedure> {
    const base = await this.procedureRepository.findOne({ where: { id } });
    if (!base) {
      throw new NotFoundException(`Procedimento com id ${id} não encontrado.`);
    }
    if (base.type !== ProcedureType.SPECIALIZED) {
      throw new BadRequestException(
        `O procedimento com id ${id} não é do tipo SPECIALIZED e não possui ciclo de autorização.`,
      );
    }
    return base as SpecializedProcedure;
  }

  private ensureCanAccess(appointment: any, currentUser: UserPayload): void {
    if (currentUser.type === UserType.ADMIN) return;
    if (currentUser.type === UserType.DOCTOR && appointment.doctorId === currentUser.sub) return;
    if (currentUser.type === UserType.PATIENT && appointment.patientId === currentUser.sub) return;
    throw new ForbiddenException('Você não tem permissão para acessar os procedimentos deste atendimento.');
  }
}
