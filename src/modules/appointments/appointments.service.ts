import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Appointment, AppointmentStatus, AppointmentType } from './entities/appointment.entity';
import { Consultation } from './entities/consultation.entity';
import { Exam } from './entities/exam.entity';
import { FollowUp } from './entities/follow-up.entity';
import {
  CreateAppointmentDto,
  FindAppointmentsQueryDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { paginate, PaginatedResult } from '../../common/dto/pagination-query.dto';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';
import { Schedule, ScheduleStatus } from '../schedules/entities/schedule.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,

    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,

    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(FollowUp)
    private readonly followUpRepository: Repository<FollowUp>,

    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,

    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto, currentUser: UserPayload): Promise<Appointment> {
    // 1. Carregar agendamento e verificar status
    const schedule = await this.scheduleRepository.findOne({
      where: { id: dto.scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(`Agendamento com id ${dto.scheduleId} não encontrado.`);
    }

    if (schedule.status !== ScheduleStatus.CONFIRMED) {
      throw new BadRequestException(
        `Apenas agendamentos com status CONFIRMED podem originar atendimentos. Status atual: ${schedule.status}.`,
      );
    }

    // 2. Verificar unicidade: schedule → appointment (1:1)
    const existing = await this.appointmentRepository.findOne({
      where: { scheduleId: dto.scheduleId },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe um atendimento (id ${existing.id}) associado ao agendamento ${dto.scheduleId}.`,
      );
    }

    // 3. Permissão: DOCTOR só pode criar atendimento do próprio agendamento
    if (currentUser.type === UserType.DOCTOR && schedule.doctorId !== currentUser.sub) {
      throw new ForbiddenException('Você só pode criar atendimentos para seus próprios agendamentos.');
    }

    // 4. Validações específicas por tipo
    this.validateTypeSpecificFields(dto);

    // 5. Se FollowUp: validar originAppointmentId
    if (dto.type === AppointmentType.FOLLOW_UP) {
      await this.validateFollowUpOrigin(dto.originAppointmentId!, schedule.patientId);
    }

    // 6. Transação: criar atendimento + marcar schedule como COMPLETED
    return this.dataSource.transaction(async (manager) => {
      const scheduleRepo = manager.getRepository(Schedule);
      await scheduleRepo.update(dto.scheduleId, {
        status: ScheduleStatus.COMPLETED,
      });

      const doctorId: number = schedule.doctorId;
      const patientId: number = schedule.patientId;
      const startedAt = new Date();

      let appointment: Appointment;

      if (dto.type === AppointmentType.CONSULTATION) {
        const entity = manager.getRepository(Consultation).create({
          scheduleId: dto.scheduleId,
          doctorId,
          patientId,
          notes: dto.notes,
          startedAt,
          reason: dto.reason!,
          diagnosticHypothesis: dto.diagnosticHypothesis ?? null,
        });
        appointment = await manager.getRepository(Consultation).save(entity);
      } else if (dto.type === AppointmentType.EXAM) {
        const entity = manager.getRepository(Exam).create({
          scheduleId: dto.scheduleId,
          doctorId,
          patientId,
          notes: dto.notes,
          startedAt,
          examType: dto.examType!,
          result: dto.result ?? null,
        });
        appointment = await manager.getRepository(Exam).save(entity);
      } else {
        // FOLLOW_UP
        const entity = manager.getRepository(FollowUp).create({
          scheduleId: dto.scheduleId,
          doctorId,
          patientId,
          notes: dto.notes,
          startedAt,
          originAppointmentId: dto.originAppointmentId!,
          clinicalEvolution: dto.clinicalEvolution ?? null,
        });
        appointment = await manager.getRepository(FollowUp).save(entity);
      }

      return appointment;
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────────────────────────────

  async findAll(
    query: FindAppointmentsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<Appointment>> {
    const { page = 1, limit = 20, sort, doctorId, patientId, type, status, startDate, endDate } = query;

    const qb = this.appointmentRepository.createQueryBuilder('appointment');

    // Filtros de acesso por perfil
    if (currentUser.type === UserType.DOCTOR) {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: currentUser.sub });
    } else if (currentUser.type === UserType.PATIENT) {
      qb.andWhere('appointment.patientId = :patientId', { patientId: currentUser.sub });
    }

    // Filtros opcionais
    if (doctorId && currentUser.type === UserType.ADMIN) {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId });
    }
    if (patientId && currentUser.type === UserType.ADMIN) {
      qb.andWhere('appointment.patientId = :patientId', { patientId });
    }
    if (type) qb.andWhere('appointment.type = :type', { type });
    if (status) qb.andWhere('appointment.status = :status', { status });
    if (startDate) qb.andWhere('appointment.startedAt >= :startDate', { startDate: new Date(startDate) });
    if (endDate) qb.andWhere('appointment.startedAt <= :endDate', { endDate: new Date(endDate) });

    this.applySorting(qb, sort, 'appointment', 'createdAt', ['createdAt', 'startedAt', 'status', 'type']);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────────────────

  async findOne(id: number, currentUser?: UserPayload): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException(`Atendimento com id ${id} não encontrado.`);
    }

    if (currentUser) {
      this.ensureCanAccess(appointment, currentUser);
    }

    return appointment;
  }

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateAppointmentDto, currentUser: UserPayload): Promise<Appointment> {
    const appointment = await this.findOne(id, currentUser);

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Apenas atendimentos IN_PROGRESS podem ser atualizados. Status atual: ${appointment.status}.`,
      );
    }

    // Campos base
    if (dto.notes !== undefined) appointment.notes = dto.notes;

    // Campos específicos por tipo
    if (appointment.type === AppointmentType.CONSULTATION) {
      const consultation = appointment as Consultation;
      if (dto.diagnosticHypothesis !== undefined) consultation.diagnosticHypothesis = dto.diagnosticHypothesis;
    } else if (appointment.type === AppointmentType.EXAM) {
      const exam = appointment as Exam;
      if (dto.result !== undefined) exam.result = dto.result;
    } else if (appointment.type === AppointmentType.FOLLOW_UP) {
      const followUp = appointment as FollowUp;
      if (dto.clinicalEvolution !== undefined) followUp.clinicalEvolution = dto.clinicalEvolution;
    }

    return this.appointmentRepository.save(appointment);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FINISH
  // ─────────────────────────────────────────────────────────────────────

  async finish(id: number, currentUser: UserPayload): Promise<Appointment> {
    const appointment = await this.findOne(id, currentUser);

    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Apenas atendimentos IN_PROGRESS podem ser encerrados. Status atual: ${appointment.status}.`,
      );
    }

    // Permissão: DOCTOR só encerra seus próprios atendimentos
    if (currentUser.type === UserType.DOCTOR && appointment.doctorId !== currentUser.sub) {
      throw new ForbiddenException('Você não tem permissão para encerrar este atendimento.');
    }

    appointment.status = AppointmentStatus.FINISHED;
    appointment.endedAt = new Date();

    return this.appointmentRepository.save(appointment);
  }

  // ─────────────────────────────────────────────────────────────────────
  // BY DOCTOR / BY PATIENT
  // ─────────────────────────────────────────────────────────────────────

  async findByDoctor(
    doctorId: number,
    query: FindAppointmentsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<Appointment>> {
    if (currentUser.type === UserType.DOCTOR && currentUser.sub !== doctorId) {
      throw new ForbiddenException('Você não tem permissão para acessar os atendimentos deste médico.');
    }

    await this.usersService.findDoctorOrFail(doctorId);
    return this.findAll({ ...query, doctorId }, currentUser);
  }

  async findByPatient(
    patientId: number,
    query: FindAppointmentsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<Appointment>> {
    if (currentUser.type === UserType.PATIENT && currentUser.sub !== patientId) {
      throw new ForbiddenException('Você não tem permissão para acessar os atendimentos deste paciente.');
    }

    await this.usersService.findPatientOrFail(patientId);
    return this.findAll({ ...query, patientId }, currentUser);
  }

  // ─────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS (usados por outros módulos)
  // ─────────────────────────────────────────────────────────────────────

  /** Retorna o atendimento sem verificação de acesso — para uso interno por outros services */
  async findOneInternal(id: number): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({ where: { id } });
    if (!appointment) {
      throw new NotFoundException(`Atendimento com id ${id} não encontrado.`);
    }
    return appointment;
  }

  // ─────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────

  private validateTypeSpecificFields(dto: CreateAppointmentDto): void {
    if (dto.type === AppointmentType.CONSULTATION && !dto.reason) {
      throw new BadRequestException('O campo reason é obrigatório para atendimentos do tipo CONSULTATION.');
    }
    if (dto.type === AppointmentType.EXAM && !dto.examType) {
      throw new BadRequestException('O campo examType é obrigatório para atendimentos do tipo EXAM.');
    }
    if (dto.type === AppointmentType.FOLLOW_UP && !dto.originAppointmentId) {
      throw new BadRequestException('O campo originAppointmentId é obrigatório para atendimentos do tipo FOLLOW_UP.');
    }
  }

  private async validateFollowUpOrigin(originId: number, patientId: number): Promise<void> {
    const origin = await this.appointmentRepository.findOne({ where: { id: originId } });

    if (!origin) {
      throw new BadRequestException(
        `O atendimento de origem (originAppointmentId=${originId}) não existe.`,
      );
    }

    if (origin.patientId !== patientId) {
      throw new BadRequestException(
        `O atendimento de origem (id=${originId}) não pertence ao mesmo paciente deste agendamento.`,
      );
    }
  }

  private ensureCanAccess(appointment: Appointment, currentUser: UserPayload): void {
    if (currentUser.type === UserType.ADMIN) return;
    if (currentUser.type === UserType.DOCTOR && appointment.doctorId === currentUser.sub) return;
    if (currentUser.type === UserType.PATIENT && appointment.patientId === currentUser.sub) return;
    throw new ForbiddenException('Você não tem permissão para acessar este atendimento.');
  }

  private applySorting(
    qb: any,
    sort: string | undefined,
    alias: string,
    defaultField: string,
    allowedFields: string[],
  ): void {
    if (!sort) {
      qb.orderBy(`${alias}.${defaultField}`, 'DESC');
      return;
    }
    const [field, direction] = sort.split(':');
    const safeField = allowedFields.includes(field) ? field : defaultField;
    qb.orderBy(`${alias}.${safeField}`, direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
  }
}
