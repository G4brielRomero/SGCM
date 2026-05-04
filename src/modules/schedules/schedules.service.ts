import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule, ScheduleStatus, ScheduleType, ALLOWED_TRANSITIONS } from './entities/schedule.entity';
import { InPersonSchedule } from './entities/in-person-schedule.entity';
import { OnlineSchedule } from './entities/online-schedule.entity';
import { HomeSchedule } from './entities/home-schedule.entity';
import { CreateScheduleDto, FindSchedulesQueryDto, UpdateScheduleDto, UpdateScheduleStatusDto } from './dto/schedule.dto';
import { paginate, PaginatedResult } from '../../common/dto/pagination-query.dto';
import { UsersService } from '../users/users.service';

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

  async create(dto: CreateScheduleDto): Promise<Schedule> {
    // Ordem: verificações baratas primeiro, depois as que acessam o banco
    this.validateFutureDate(dto.scheduledAt);

    // Valida existência de médico e paciente antes de verificar conflito
    await this.usersService.findDoctorOrFail(dto.doctorId);
    await this.usersService.findPatientOrFail(dto.patientId);

    // Verifica conflito de horário (apenas agendamentos CONFIRMED)
    await this.checkScheduleConflict(dto.doctorId, dto.scheduledAt);

    return this.persistSchedule(dto);
  }

  private async persistSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    if (dto.type === ScheduleType.IN_PERSON) {
      const s = this.inPersonRepository.create({
        scheduledAt: new Date(dto.scheduledAt),
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        room: dto.room,
        unit: dto.unit,
        status: ScheduleStatus.PENDING,
      });
      return this.inPersonRepository.save(s);
    }
    if (dto.type === ScheduleType.ONLINE) {
      const s = this.onlineRepository.create({
        scheduledAt: new Date(dto.scheduledAt),
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        accessLink: dto.accessLink,
        platform: dto.platform,
        status: ScheduleStatus.PENDING,
      });
      return this.onlineRepository.save(s);
    }
    // HOME
    const s = this.homeRepository.create({
      scheduledAt: new Date(dto.scheduledAt),
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      fullAddress: dto.fullAddress,
      accessNotes: dto.accessNotes,
      status: ScheduleStatus.PENDING,
    });
    return this.homeRepository.save(s);
  }

  async findAll(query: FindSchedulesQueryDto): Promise<PaginatedResult<Schedule>> {
    const { page = 1, limit = 20, sort, doctorId, patientId, status, type, startDate, endDate } = query;
    const qb = this.scheduleRepository.createQueryBuilder('schedule');

    if (doctorId) qb.andWhere('schedule.doctorId = :doctorId', { doctorId });
    if (patientId) qb.andWhere('schedule.patientId = :patientId', { patientId });
    if (status) qb.andWhere('schedule.status = :status', { status });
    if (type) qb.andWhere('schedule.type = :type', { type });
    if (startDate) qb.andWhere('schedule.scheduledAt >= :startDate', { startDate: new Date(startDate) });
    if (endDate) qb.andWhere('schedule.scheduledAt <= :endDate', { endDate: new Date(endDate) });

    this.applySorting(qb, sort, 'schedule', 'scheduledAt');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: number): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException(`Agendamento com id ${id} não foi encontrado.`);
    return schedule;
  }

  async update(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.findOne(id);

    if ([ScheduleStatus.CANCELLED, ScheduleStatus.COMPLETED].includes(schedule.status)) {
      throw new BadRequestException(`Agendamento com status ${schedule.status} não pode ser atualizado.`);
    }

    if (dto.scheduledAt) {
      this.validateFutureDate(dto.scheduledAt);
      await this.checkScheduleConflict(schedule.doctorId, dto.scheduledAt, id);
    }

    Object.assign(schedule, dto);
    return this.scheduleRepository.save(schedule);
  }

  async updateStatus(id: number, dto: UpdateScheduleStatusDto): Promise<Schedule> {
    const schedule = await this.findOne(id);
    const newStatus = dto.status as ScheduleStatus;

    const allowed = ALLOWED_TRANSITIONS[schedule.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de ${schedule.status} para ${newStatus} não é permitida. ` +
        `Transições válidas a partir de ${schedule.status}: ${allowed.join(', ') || 'nenhuma'}.`,
      );
    }

    // Verifica conflito de horário ao confirmar — evita dois CONFIRMED no mesmo horário
    if (newStatus === ScheduleStatus.CONFIRMED) {
      await this.checkScheduleConflict(schedule.doctorId, schedule.scheduledAt.toISOString(), id);
    }

    schedule.status = newStatus;

    if (newStatus === ScheduleStatus.CANCELLED) {
      schedule.cancelledAt = new Date();
      schedule.cancellationReason = dto.cancellationReason ?? null;
      // cancelledBy será preenchido na Etapa 2 com o usuário autenticado
    }

    return this.scheduleRepository.save(schedule);
  }

  // Método exposto para o AppointmentsService (Etapa 3) — transição CONFIRMED → COMPLETED
  async complete(id: number): Promise<Schedule> {
    const schedule = await this.findOne(id);
    if (schedule.status !== ScheduleStatus.CONFIRMED) {
      throw new BadRequestException(`Apenas agendamentos CONFIRMED podem ser concluídos. Status atual: ${schedule.status}.`);
    }
    schedule.status = ScheduleStatus.COMPLETED;
    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number): Promise<void> {
    const schedule = await this.findOne(id);
    if (schedule.status === ScheduleStatus.COMPLETED) {
      throw new ConflictException(`Agendamento com status COMPLETED não pode ser excluído pois originou um atendimento clínico.`);
    }
    await this.scheduleRepository.remove(schedule);
  }

  async findByDoctor(doctorId: number, query: FindSchedulesQueryDto): Promise<PaginatedResult<Schedule>> {
    await this.usersService.findDoctorOrFail(doctorId);
    return this.findAll({ ...query, doctorId });
  }

  async findByPatient(patientId: number, query: FindSchedulesQueryDto): Promise<PaginatedResult<Schedule>> {
    await this.usersService.findPatientOrFail(patientId);
    return this.findAll({ ...query, patientId });
  }

  private validateFutureDate(scheduledAt: string): void {
    const date = new Date(scheduledAt);
    if (date <= new Date()) {
      throw new BadRequestException('scheduledAt deve ser uma data no futuro.');
    }
  }

  private async checkScheduleConflict(doctorId: number, scheduledAt: string, excludeId?: number): Promise<void> {
    const qb = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.doctorId = :doctorId', { doctorId })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.CONFIRMED })
      .andWhere('schedule.scheduledAt = :scheduledAt', { scheduledAt: new Date(scheduledAt) });

    if (excludeId) qb.andWhere('schedule.id != :excludeId', { excludeId });

    const conflict = await qb.getOne();
    if (conflict) {
      const formattedDate = new Date(scheduledAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      throw new ConflictException(
        `O médico com id ${doctorId} já possui um agendamento confirmado para ${formattedDate}.`,
      );
    }
  }

  private applySorting(qb: any, sort: string | undefined, alias: string, defaultField: string): void {
    if (!sort) { qb.orderBy(`${alias}.${defaultField}`, 'ASC'); return; }
    const [field, direction] = sort.split(':');
    qb.orderBy(`${alias}.${field}`, direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
  }
}