import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  Schedule,
  ScheduleStatus,
  ScheduleType,
  ALLOWED_TRANSITIONS,
} from './entities/schedule.entity';
import { InPersonSchedule } from './entities/in-person-schedule.entity';
import { OnlineSchedule } from './entities/online-schedule.entity';
import { HomeSchedule } from './entities/home-schedule.entity';
import {
  CreateScheduleDto,
  FindSchedulesQueryDto,
  UpdateScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/schedule.dto';
import {
  paginate,
  PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { UsersService } from '../users/users.service';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,

    @InjectRepository(InPersonSchedule)
    private readonly inPersonRepository: Repository<InPersonSchedule>,

    @InjectRepository(OnlineSchedule)
    private readonly onlineRepository: Repository<OnlineSchedule>,

    @InjectRepository(HomeSchedule)
    private readonly homeRepository: Repository<HomeSchedule>,

    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateScheduleDto,
    currentUser?: UserPayload,
  ): Promise<Schedule> {
    if (currentUser?.type === UserType.PATIENT) {
      if (dto.patientId && dto.patientId !== currentUser.sub) {
        throw new ForbiddenException('Você não tem permissão para criar agendamentos para outro paciente.');
      }
      dto.patientId = currentUser.sub;
    }

    this.ensureCanCreateSchedule(dto, currentUser);
    this.validateFutureDate(dto.scheduledAt);

    await this.usersService.findDoctorOrFail(dto.doctorId);
    await this.usersService.findPatientOrFail(dto.patientId);

    await this.checkScheduleConflict(dto.doctorId, dto.scheduledAt);

    return this.persistSchedule(dto, currentUser?.sub);
  }

  private async persistSchedule(
    dto: CreateScheduleDto,
    createdBy?: number,
  ): Promise<Schedule> {
    if (dto.type === ScheduleType.IN_PERSON) {
      const schedule = this.inPersonRepository.create({
        scheduledAt: new Date(dto.scheduledAt),
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        room: dto.room,
        unit: dto.unit,
        status: ScheduleStatus.PENDING,
        createdBy: createdBy ?? null,
      });

      return this.inPersonRepository.save(schedule);
    }

    if (dto.type === ScheduleType.ONLINE) {
      const schedule = this.onlineRepository.create({
        scheduledAt: new Date(dto.scheduledAt),
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        accessLink: dto.accessLink,
        platform: dto.platform,
        status: ScheduleStatus.PENDING,
        createdBy: createdBy ?? null,
      });

      return this.onlineRepository.save(schedule);
    }

    const schedule = this.homeRepository.create({
      scheduledAt: new Date(dto.scheduledAt),
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      fullAddress: dto.fullAddress,
      accessNotes: dto.accessNotes,
      status: ScheduleStatus.PENDING,
      createdBy: createdBy ?? null,
    });

    return this.homeRepository.save(schedule);
  }

  async findAll(
    query: FindSchedulesQueryDto,
    currentUser?: UserPayload,
  ): Promise<PaginatedResult<Schedule>> {
    const {
      page = 1,
      limit = 20,
      sort,
      search,
      doctorId,
      patientId,
      status,
      type,
      startDate,
      endDate,
    } = query;

    const qb = this.scheduleRepository.createQueryBuilder('schedule');

    if (search) {
      qb.leftJoin('schedule.doctor', 'searchDoctor')
        .leftJoin('schedule.patient', 'searchPatient')
        .andWhere(
          'searchDoctor.name LIKE :search OR searchPatient.name LIKE :search',
          {
            search: `%${search}%`,
          },
        );
    }

    if (doctorId) {
      qb.andWhere('schedule.doctorId = :doctorId', { doctorId });
    }

    if (patientId) {
      qb.andWhere('schedule.patientId = :patientId', { patientId });
    }

    if (currentUser?.type === UserType.DOCTOR) {
      qb.andWhere('schedule.doctorId = :currentDoctorId', {
        currentDoctorId: currentUser.sub,
      });
    }

    if (currentUser?.type === UserType.PATIENT) {
      qb.andWhere('schedule.patientId = :currentPatientId', {
        currentPatientId: currentUser.sub,
      });
    }

    if (status) {
      qb.andWhere('schedule.status = :status', { status });
    }

    if (type) {
      qb.andWhere('schedule.type = :type', { type });
    }

    if (startDate) {
      qb.andWhere('schedule.scheduledAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      qb.andWhere('schedule.scheduledAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    this.applySorting(qb, sort, 'schedule', 'scheduledAt');

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findOne(id: number, currentUser?: UserPayload): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });

    if (!schedule) {
      throw new NotFoundException(
        `Agendamento com id ${id} não foi encontrado.`,
      );
    }

    if (currentUser) {
      this.ensureCanAccessSchedule(schedule, currentUser);
    }

    return schedule;
  }

  async update(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.findOne(id);

    if (
      [ScheduleStatus.CANCELLED, ScheduleStatus.COMPLETED].includes(
        schedule.status,
      )
    ) {
      throw new BadRequestException(
        `Agendamento com status ${schedule.status} não pode ser atualizado.`,
      );
    }

    const nextDoctorId = dto.doctorId ?? schedule.doctorId;
    const nextPatientId = dto.patientId ?? schedule.patientId;
    const nextScheduledAt =
      dto.scheduledAt ?? schedule.scheduledAt.toISOString();

    if (dto.doctorId) {
      await this.usersService.findDoctorOrFail(dto.doctorId);
    }

    if (dto.patientId) {
      await this.usersService.findPatientOrFail(dto.patientId);
    }

    if (dto.scheduledAt) {
      this.validateFutureDate(dto.scheduledAt);
    }

    await this.checkScheduleConflict(nextDoctorId, nextScheduledAt, id);

    Object.assign(schedule, {
      ...dto,
      scheduledAt: dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : schedule.scheduledAt,
      doctorId: nextDoctorId,
      patientId: nextPatientId,
    });

    return this.scheduleRepository.save(schedule);
  }

  async updateStatus(
    id: number,
    dto: UpdateScheduleStatusDto,
    currentUser?: UserPayload,
  ): Promise<Schedule> {
    const schedule = await this.findOne(id);

    if (currentUser) {
      this.ensureCanUpdateScheduleStatus(schedule, dto, currentUser);
    }

    const newStatus = dto.status as ScheduleStatus;
    const allowed = ALLOWED_TRANSITIONS[schedule.status] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de ${schedule.status} para ${newStatus} não é permitida. ` +
          `Transições válidas a partir de ${schedule.status}: ${allowed.join(', ') || 'nenhuma'}.`,
      );
    }

    if (newStatus === ScheduleStatus.CONFIRMED) {
      await this.checkScheduleConflict(
        schedule.doctorId,
        schedule.scheduledAt.toISOString(),
        id,
      );
    }

    schedule.status = newStatus;

    if (newStatus === ScheduleStatus.CANCELLED) {
      schedule.cancelledAt = new Date();
      schedule.cancellationReason = dto.cancellationReason ?? null;
      schedule.cancelledBy = currentUser?.sub ?? null;
    }

    return this.scheduleRepository.save(schedule);
  }

  async complete(id: number, manager?: EntityManager): Promise<Schedule> {
    const scheduleRepo = manager
      ? manager.getRepository(Schedule)
      : this.scheduleRepository;

    const schedule = await scheduleRepo.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException(
        `Agendamento com id ${id} não foi encontrado.`,
      );
    }

    if (schedule.status !== ScheduleStatus.CONFIRMED) {
      throw new BadRequestException(
        `Apenas agendamentos CONFIRMED podem ser concluídos. Status atual: ${schedule.status}.`,
      );
    }

    schedule.status = ScheduleStatus.COMPLETED;

    return scheduleRepo.save(schedule);
  }

  async remove(id: number): Promise<void> {
    const schedule = await this.findOne(id);

    if (schedule.status === ScheduleStatus.CONFIRMED) {
      throw new ConflictException(
        'Agendamento com status CONFIRMED não pode ser excluído. Cancele-o antes de remover.',
      );
    }

    if (schedule.status === ScheduleStatus.COMPLETED) {
      throw new ConflictException(
        'Agendamento com status COMPLETED não pode ser excluído pois originou um atendimento clínico.',
      );
    }

    await this.scheduleRepository.remove(schedule);
  }

  async findByDoctor(
    doctorId: number,
    query: FindSchedulesQueryDto,
    currentUser?: UserPayload,
  ): Promise<PaginatedResult<Schedule>> {
    if (currentUser?.type === UserType.DOCTOR && currentUser.sub !== doctorId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar os agendamentos deste médico.',
      );
    }

    await this.usersService.findDoctorOrFail(doctorId);

    return this.findAll({ ...query, doctorId }, currentUser);
  }

  async findByPatient(
    patientId: number,
    query: FindSchedulesQueryDto,
    currentUser?: UserPayload,
  ): Promise<PaginatedResult<Schedule>> {
    if (
      currentUser?.type === UserType.PATIENT &&
      currentUser.sub !== patientId
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar os agendamentos deste paciente.',
      );
    }

    await this.usersService.findPatientOrFail(patientId);

    return this.findAll({ ...query, patientId }, currentUser);
  }

  private ensureCanCreateSchedule(
    dto: CreateScheduleDto,
    currentUser?: UserPayload,
  ): void {
    if (!currentUser) {
      return;
    }

    if (currentUser.type === UserType.ADMIN) {
      return;
    }

    if (
      currentUser.type === UserType.PATIENT &&
      currentUser.sub === dto.patientId
    ) {
      return;
    }

    throw new ForbiddenException(
      'Você não tem permissão para criar este agendamento.',
    );
  }

  private ensureCanAccessSchedule(
    schedule: Schedule,
    currentUser: UserPayload,
  ): void {
    if (currentUser.type === UserType.ADMIN) {
      return;
    }

    if (
      currentUser.type === UserType.DOCTOR &&
      schedule.doctorId === currentUser.sub
    ) {
      return;
    }

    if (
      currentUser.type === UserType.PATIENT &&
      schedule.patientId === currentUser.sub
    ) {
      return;
    }

    throw new ForbiddenException(
      'Você não tem permissão para acessar este agendamento.',
    );
  }

  private ensureCanUpdateScheduleStatus(
    schedule: Schedule,
    dto: UpdateScheduleStatusDto,
    currentUser: UserPayload,
  ): void {
    if (currentUser.type === UserType.ADMIN) {
      return;
    }

    if (currentUser.type === UserType.DOCTOR) {
      if (schedule.doctorId !== currentUser.sub) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar este agendamento.',
        );
      }

      return;
    }

    if (currentUser.type === UserType.PATIENT) {
      if (schedule.patientId !== currentUser.sub) {
        throw new ForbiddenException(
          'Você não tem permissão para alterar este agendamento.',
        );
      }

      if (dto.status !== ScheduleStatus.CANCELLED) {
        throw new ForbiddenException(
          'Paciente só pode cancelar o próprio agendamento.',
        );
      }

      return;
    }

    throw new ForbiddenException(
      'Você não tem permissão para alterar este agendamento.',
    );
  }

  private validateFutureDate(scheduledAt: string): void {
    const date = new Date(scheduledAt);

    if (date <= new Date()) {
      throw new BadRequestException('scheduledAt deve ser uma data no futuro.');
    }
  }

  private async checkScheduleConflict(
    doctorId: number,
    scheduledAt: string,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.doctorId = :doctorId', { doctorId })
      .andWhere('schedule.status = :status', {
        status: ScheduleStatus.CONFIRMED,
      })
      .andWhere('schedule.scheduledAt = :scheduledAt', {
        scheduledAt: new Date(scheduledAt),
      });

    if (excludeId) {
      qb.andWhere('schedule.id != :excludeId', { excludeId });
    }

    const conflict = await qb.getOne();

    if (conflict) {
      const formattedDate = new Date(scheduledAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });

      throw new ConflictException(
        `O médico com id ${doctorId} já possui um agendamento confirmado para ${formattedDate}.`,
      );
    }
  }

  private applySorting(
    qb: any,
    sort: string | undefined,
    alias: string,
    defaultField: string,
    allowedFields: string[] = ['scheduledAt', 'status', 'type', 'createdAt'],
  ): void {
    if (!sort) {
      qb.orderBy(`${alias}.${defaultField}`, 'ASC');
      return;
    }

    const [field, direction] = sort.split(':');
    const safeField = allowedFields.includes(field) ? field : defaultField;

    qb.orderBy(
      `${alias}.${safeField}`,
      direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    );
  }
}
