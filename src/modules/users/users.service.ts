import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Admin } from './entities/admin.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindDoctorsQueryDto, FindUsersQueryDto } from './dto/find-users-query.dto';
import { paginate, PaginatedResult } from '../../common/dto/pagination-query.dto';
import { ScheduleStatus } from '../schedules/entities/schedule.entity';
import { UserPayload } from '../auth/types/user-payload.interface';

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const emailExists = await this.userRepository.findOne({ where: { email: dto.email } });

    if (emailExists) {
      throw new ConflictException(`Já existe um usuário cadastrado com o e-mail ${dto.email}.`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    if (dto.type === UserType.DOCTOR) {
      return this.createDoctor(dto, hashedPassword);
    }

    if (dto.type === UserType.PATIENT) {
      return this.createPatient(dto, hashedPassword);
    }

    return this.createAdmin(dto, hashedPassword);
  }

  private async createDoctor(dto: CreateUserDto, hashedPassword: string): Promise<Doctor> {
    if (!dto.crm) {
      throw new BadRequestException('CRM é obrigatório para médicos.');
    }

    const crmExists = await this.doctorRepository.findOne({ where: { crm: dto.crm } });

    if (crmExists) {
      throw new ConflictException(`Já existe um médico cadastrado com o CRM ${dto.crm}.`);
    }

    const doctor = this.doctorRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      crm: dto.crm,
    });

    return this.doctorRepository.save(doctor);
  }

  private async createPatient(dto: CreateUserDto, hashedPassword: string): Promise<Patient> {
    if (!dto.cpf) {
      throw new BadRequestException('CPF é obrigatório para pacientes.');
    }

    if (!dto.birthDate) {
      throw new BadRequestException('Data de nascimento é obrigatória para pacientes.');
    }

    this.validateBirthDateInPast(dto.birthDate);

    const cpfExists = await this.patientRepository.findOne({ where: { cpf: dto.cpf } });

    if (cpfExists) {
      throw new ConflictException(`Já existe um paciente cadastrado com o CPF ${dto.cpf}.`);
    }

    const patient = this.patientRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      cpf: dto.cpf,
      birthDate: dto.birthDate,
    });

    return this.patientRepository.save(patient);
  }

  private async createAdmin(dto: CreateUserDto, hashedPassword: string): Promise<Admin> {
    const admin = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      type: UserType.ADMIN,
    }) as Admin;

    return this.userRepository.save(admin) as Promise<Admin>;
  }

  async findAll(query: FindUsersQueryDto): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 20, sort, search, type } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    if (type) {
      qb.andWhere('user.type = :type', { type });
    }

    if (search) {
      qb.andWhere('user.name LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`,
      });
    }

    this.applySorting(qb, sort, 'user', 'name', ['name', 'email', 'createdAt', 'updatedAt']);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findAllDoctors(query: FindDoctorsQueryDto): Promise<PaginatedResult<Doctor>> {
    const { page = 1, limit = 20, sort, search, specialtyId } = query;

    const qb = this.doctorRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.specialties', 'specialty')
      .where('doctor.isActive = :isActive', { isActive: true });

    if (specialtyId) {
      qb.andWhere('specialty.id = :specialtyId', { specialtyId });
    }

    if (search) {
      qb.andWhere('doctor.name LIKE :search', { search: `%${search}%` });
    }

    this.applySorting(qb, sort, 'doctor', 'name', ['name', 'crm', 'createdAt', 'updatedAt']);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findAllPatients(query: FindUsersQueryDto): Promise<PaginatedResult<Patient>> {
    const { page = 1, limit = 20, sort, search } = query;

    const qb = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.isActive = :isActive', { isActive: true });

    if (search) {
      qb.andWhere('patient.name LIKE :search', { search: `%${search}%` });
    }

    this.applySorting(qb, sort, 'patient', 'name', ['name', 'createdAt', 'updatedAt']);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, page, limit);
  }

  async findOne(id: number, currentUser?: UserPayload): Promise<User> {
    if (currentUser) {
      this.ensureCanAccessUser(id, currentUser);
    }

    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com id ${id} não foi encontrado.`);
    }

    if (user.type === UserType.DOCTOR) {
      return this.findDoctor(id);
    }

    if (user.type === UserType.PATIENT) {
      return this.findPatient(id, currentUser);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findActiveById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com id ${id} não foi encontrado.`);
    }

    return user;
  }

  async updateRefreshToken(
    userId: number,
    refreshTokenHash: string | null,
    refreshTokenJti: string | null,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: refreshTokenHash,
      refreshTokenJti,
    });
  }

  async findDoctor(id: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { id, isActive: true },
      relations: ['specialties'],
    });

    if (!doctor) {
      throw new NotFoundException(`Médico com id ${id} não foi encontrado.`);
    }

    return doctor;
  }

  async findPatient(id: number, currentUser?: UserPayload): Promise<Patient> {
    if (currentUser?.type === UserType.PATIENT && currentUser.sub !== id) {
      throw new ForbiddenException('Você não tem permissão para acessar este paciente.');
    }

    const patient = await this.patientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente com id ${id} não foi encontrado.`);
    }

    return patient;
  }

  async findDoctorOrFail(id: number): Promise<Doctor> {
    return this.findDoctor(id);
  }

  async findPatientOrFail(id: number): Promise<Patient> {
    return this.findPatient(id);
  }

  async saveDoctor(doctor: Doctor): Promise<Doctor> {
    return this.doctorRepository.save(doctor);
  }

  async update(id: number, dto: UpdateUserDto, currentUser?: UserPayload): Promise<User> {
    if (currentUser) {
      this.ensureCanAccessUser(id, currentUser);
    }

    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new ConflictException(`E-mail ${dto.email} já está em uso.`);
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    }

    if (user.type === UserType.DOCTOR && dto.crm) {
      const crmExists = await this.doctorRepository.findOne({
        where: { crm: dto.crm },
      });

      if (crmExists && crmExists.id !== id) {
        throw new ConflictException(`CRM ${dto.crm} já está em uso.`);
      }
    }

    if (user.type === UserType.PATIENT && dto.cpf) {
      const cpfExists = await this.patientRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (cpfExists && cpfExists.id !== id) {
        throw new ConflictException(`CPF ${dto.cpf} já está em uso.`);
      }
    }

    if (dto.birthDate) {
      this.validateBirthDateInPast(dto.birthDate);
    }

    Object.assign(user, dto);

    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);

    await this.checkActiveSchedules(id);

    user.isActive = false;

    await this.userRepository.save(user);
  }

  private ensureCanAccessUser(userId: number, currentUser: UserPayload): void {
    if (currentUser.type === UserType.ADMIN) {
      return;
    }

    if (currentUser.sub === userId) {
      return;
    }

    throw new ForbiddenException('Você não tem permissão para acessar este usuário.');
  }

  private async checkActiveSchedules(userId: number): Promise<void> {
    const count = await this.userRepository.manager
      .getRepository('schedules')
      .createQueryBuilder('schedule')
      .where(
        '(schedule.doctorId = :id OR schedule.patientId = :id) AND schedule.status IN (:...statuses)',
        {
          id: userId,
          statuses: [ScheduleStatus.PENDING, ScheduleStatus.CONFIRMED],
        },
      )
      .getCount()
      .catch(() => 0);

    if (count > 0) {
      throw new ConflictException(
        `Usuário com id ${userId} possui ${count} agendamento(s) ativo(s) e não pode ser removido.`,
      );
    }
  }

  private validateBirthDateInPast(birthDate: string): void {
    const date = new Date(birthDate);

    if (date >= new Date()) {
      throw new BadRequestException('Data de nascimento deve ser uma data no passado.');
    }
  }

  private applySorting(
    qb: any,
    sort: string | undefined,
    alias: string,
    defaultField: string,
    allowedFields: string[] = ['name', 'email', 'createdAt', 'updatedAt'],
  ): void {
    if (!sort) {
      qb.orderBy(`${alias}.${defaultField}`, 'ASC');
      return;
    }

    const [field, direction] = sort.split(':');
    const dir = direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const safeField = allowedFields.includes(field) ? field : defaultField;

    qb.orderBy(`${alias}.${safeField}`, dir);
  }
}