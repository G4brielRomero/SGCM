import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalRecord } from './entities/medical-record.entity';
import {
  CreateMedicalRecordDto,
  FindMedicalRecordsQueryDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { AppointmentStatus } from '../appointments/entities/appointment.entity';
import { UsersService } from '../users/users.service';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';
import { paginate, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecord)
    private readonly recordRepository: Repository<MedicalRecord>,

    private readonly appointmentsService: AppointmentsService,
    private readonly usersService: UsersService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────

  async create(dto: CreateMedicalRecordDto, appointmentId: number, currentUser: UserPayload): Promise<MedicalRecord> {
    const appointment = await this.appointmentsService.findOneInternal(appointmentId);

    if (appointment.status !== AppointmentStatus.FINISHED) {
      throw new BadRequestException(
        `Prontuários só podem ser criados para atendimentos FINISHED. Status atual: ${appointment.status}.`,
      );
    }

    if (currentUser.type === UserType.DOCTOR && appointment.doctorId !== currentUser.sub) {
      throw new ForbiddenException('Você só pode criar prontuários para seus próprios atendimentos.');
    }

    const existing = await this.recordRepository.findOne({
      where: { appointmentId },
    });
    if (existing) {
      throw new ConflictException(
        `Já existe um prontuário (id ${existing.id}) para o atendimento ${appointmentId}.`,
      );
    }

    const record = this.recordRepository.create({
      appointmentId,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      diagnosis: dto.diagnosis,
      prescription: dto.prescription ?? null,
      notes: dto.notes ?? null,
      lastUpdatedBy: null,
    });

    return this.recordRepository.save(record);
  }

  // ─────────────────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────────────────

  async findOne(id: number, currentUser: UserPayload): Promise<MedicalRecord> {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prontuário com id ${id} não encontrado.`);
    }
    this.ensureCanAccess(record, currentUser);
    return record;
  }

  // ─────────────────────────────────────────────────────────────────────
  // FIND BY APPOINTMENT
  // ─────────────────────────────────────────────────────────────────────

  async findByAppointment(appointmentId: number, currentUser: UserPayload): Promise<MedicalRecord> {
    await this.appointmentsService.findOneInternal(appointmentId);

    const record = await this.recordRepository.findOne({ where: { appointmentId } });
    if (!record) {
      throw new NotFoundException(`Nenhum prontuário encontrado para o atendimento ${appointmentId}.`);
    }
    this.ensureCanAccess(record, currentUser);
    return record;
  }

  // ─────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────

  async update(
    id: number,
    dto: UpdateMedicalRecordDto,
    currentUser: UserPayload,
  ): Promise<MedicalRecord> {
    const record = await this.findOne(id, currentUser);

    if (currentUser.type === UserType.DOCTOR && record.doctorId !== currentUser.sub) {
      throw new ForbiddenException('Você só pode atualizar prontuários dos seus próprios atendimentos.');
    }

    if (dto.prescription !== undefined) record.prescription = dto.prescription;
    if (dto.notes !== undefined) record.notes = dto.notes;
    record.lastUpdatedBy = currentUser.sub;

    return this.recordRepository.save(record);
  }

  // ─────────────────────────────────────────────────────────────────────
  // REMOVE — bloqueado (prontuário é documento permanente)
  // ─────────────────────────────────────────────────────────────────────

  remove(): never {
    throw new MethodNotAllowedException(
      'Prontuários são documentos clínicos permanentes e não podem ser excluídos.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // BY PATIENT
  // ─────────────────────────────────────────────────────────────────────

  async findByPatient(
    patientId: number,
    query: FindMedicalRecordsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<MedicalRecord>> {
    if (currentUser.type === UserType.PATIENT && currentUser.sub !== patientId) {
      throw new ForbiddenException('Você só pode acessar seus próprios prontuários.');
    }

    await this.usersService.findPatientOrFail(patientId);

    const { page = 1, limit = 20, sort, search } = query;
    const qb = this.recordRepository
      .createQueryBuilder('r')
      .where('r.patientId = :patientId', { patientId });

    if (currentUser.type === UserType.DOCTOR) {
      qb.andWhere('r.doctorId = :doctorId', { doctorId: currentUser.sub });
    }

    if (search) {
      qb.andWhere(
        '(r.diagnosis LIKE :search OR r.prescription LIKE :search OR r.notes LIKE :search)',
        { search: `%${search}%` },
      );
    }

    this.applySorting(qb, sort, 'r');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  // ─────────────────────────────────────────────────────────────────────
  // BY DOCTOR
  // ─────────────────────────────────────────────────────────────────────

  async findByDoctor(
    doctorId: number,
    query: FindMedicalRecordsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<MedicalRecord>> {
    if (currentUser.type === UserType.DOCTOR && currentUser.sub !== doctorId) {
      throw new ForbiddenException('Você só pode acessar prontuários dos seus próprios atendimentos.');
    }

    await this.usersService.findDoctorOrFail(doctorId);

    const { page = 1, limit = 20, sort, search } = query;
    const qb = this.recordRepository
      .createQueryBuilder('r')
      .where('r.doctorId = :doctorId', { doctorId });

    if (search) {
      qb.andWhere(
        '(r.diagnosis LIKE :search OR r.prescription LIKE :search OR r.notes LIKE :search)',
        { search: `%${search}%` },
      );
    }

    this.applySorting(qb, sort, 'r');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  // ─────────────────────────────────────────────────────────────────────
  // AGGREGATION (usado pelo AdminModule)
  // ─────────────────────────────────────────────────────────────────────

  async countTotal(): Promise<number> {
    return this.recordRepository.count();
  }

  // ─────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────

  private ensureCanAccess(record: MedicalRecord, currentUser: UserPayload): void {
    if (currentUser.type === UserType.ADMIN) return;
    if (currentUser.type === UserType.DOCTOR && record.doctorId === currentUser.sub) return;
    if (currentUser.type === UserType.PATIENT && record.patientId === currentUser.sub) return;
    throw new ForbiddenException('Você não tem permissão para acessar este prontuário.');
  }

  private applySorting(qb: any, sort: string | undefined, alias: string): void {
    const allowed = ['createdAt', 'updatedAt'];
    const [field, dir] = (sort ?? 'createdAt:desc').split(':');
    const safeField = allowed.includes(field) ? field : 'createdAt';
    qb.orderBy(`${alias}.${safeField}`, dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
  }
}
