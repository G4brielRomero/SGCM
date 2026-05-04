import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialty } from './entities/specialty.entity';
import { CreateSpecialtyDto, UpdateSpecialtyDto } from './dto/specialty.dto';
import { paginate, PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class SpecialtiesService {
  constructor(
    @InjectRepository(Specialty)
    private readonly specialtyRepository: Repository<Specialty>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateSpecialtyDto): Promise<Specialty> {
    // Garante unicidade do nome da especialidade
    const exists = await this.specialtyRepository.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Especialidade com nome "${dto.name}" já está cadastrada.`);
    const specialty = this.specialtyRepository.create(dto);
    return this.specialtyRepository.save(specialty);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<Specialty>> {
    const { page = 1, limit = 20, sort, search } = query;
    const qb = this.specialtyRepository.createQueryBuilder('specialty');

    // Filtro por nome ou descrição
    if (search) qb.where('specialty.name LIKE :search OR specialty.description LIKE :search', { search: `%${search}%` });

    this.applySorting(qb, sort, 'specialty', 'name');

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findOne(id: number): Promise<Specialty> {
    const specialty = await this.specialtyRepository.findOne({ where: { id } });

    // Valida existência da especialidade
    if (!specialty) throw new NotFoundException(`Especialidade com id ${id} não foi encontrada.`);

    return specialty;
  }

  async update(id: number, dto: UpdateSpecialtyDto): Promise<Specialty> {
    const specialty = await this.findOne(id);

    // Valida alteração de nome mantendo unicidade
    if (dto.name && dto.name !== specialty.name) {
      const exists = await this.specialtyRepository.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException(`Especialidade com nome "${dto.name}" já está cadastrada.`);
    }

    Object.assign(specialty, dto);

    return this.specialtyRepository.save(specialty);
  }

  async remove(id: number): Promise<void> {
    const specialty = await this.specialtyRepository.findOne({ where: { id }, relations: ['doctors'] });

    // Valida existência
    if (!specialty) throw new NotFoundException(`Especialidade com id ${id} não foi encontrada.`);

    // Impede remoção se houver médicos associados
    if (specialty.doctors && specialty.doctors.length > 0) {
      throw new ConflictException(
        `Especialidade "${specialty.name}" possui ${specialty.doctors.length} médico(s) associado(s) e não pode ser removida.`,
      );
    }

    await this.specialtyRepository.remove(specialty);
  }

  async associateDoctor(doctorId: number, specialtyId: number): Promise<void> {
    const doctor = await this.usersService.findDoctor(doctorId);
    const specialty = await this.findOne(specialtyId);

    // Evita duplicidade de associação
    const alreadyAssociated = doctor.specialties?.some((s) => s.id === specialtyId);
    if (alreadyAssociated) {
      throw new ConflictException(`Médico com id ${doctorId} já possui a especialidade "${specialty.name}".`);
    }

    if (!doctor.specialties) doctor.specialties = [];
    doctor.specialties.push(specialty);

    // Salva a relação atualizada
    await this.usersService['doctorRepository'].save(doctor);
  }

  async dissociateDoctor(doctorId: number, specialtyId: number): Promise<void> {
    const doctor = await this.usersService.findDoctor(doctorId);

    // Garante que a especialidade existe
    await this.findOne(specialtyId);

    const before = doctor.specialties?.length ?? 0;

    // Remove a especialidade da lista
    doctor.specialties = (doctor.specialties ?? []).filter((s) => s.id !== specialtyId);

    // Se nada mudou, significa que não estava associado
    if (doctor.specialties.length === before) {
      throw new NotFoundException(`Médico com id ${doctorId} não possui a especialidade com id ${specialtyId}.`);
    }

    await this.usersService['doctorRepository'].save(doctor);
  }

  async findDoctorSpecialties(doctorId: number, query: PaginationQueryDto): Promise<PaginatedResult<Specialty>> {
    const doctor = await this.usersService.findDoctor(doctorId);

    const specialties = doctor.specialties ?? [];

    const { page = 1, limit = 20 } = query;

    const start = (page - 1) * limit;

    // Paginação manual em memória
    return paginate(specialties.slice(start, start + limit), specialties.length, page, limit);
  }

  async findDoctorsBySpecialty(specialtyId: number, query: PaginationQueryDto) {
    // Garante que a especialidade existe
    await this.findOne(specialtyId);

    const { page = 1, limit = 20 } = query;

    const qb = this.specialtyRepository.manager
      .getRepository('users')
      .createQueryBuilder('doctor')
      .innerJoin('doctor_specialties', 'ds', 'ds.doctorId = doctor.id')
      .where('ds.specialtyId = :specialtyId AND doctor.isActive = 1', { specialtyId })
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return paginate(data, total, page, limit);
  }

  private applySorting(qb: any, sort: string | undefined, alias: string, defaultField: string): void {
    // Ordenação padrão por nome
    if (!sort) { qb.orderBy(`${alias}.${defaultField}`, 'ASC'); return; }

    const [field, direction] = sort.split(':');

    qb.orderBy(`${alias}.${field}`, direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
  }
}