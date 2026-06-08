import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as PDFDocument from 'pdfkit';
import { Report, ReportStatus } from './entities/report.entity';
import { FindReportsQueryDto, RevokeReportDto } from './dto/report.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  AppointmentStatus,
  AppointmentType,
} from '../appointments/entities/appointment.entity';
import { Exam } from '../appointments/entities/exam.entity';
import { UsersService } from '../users/users.service';
import { UserPayload } from '../auth/types/user-payload.interface';
import { UserType } from '../users/entities/user.entity';
import { paginate, PaginatedResult } from '../../common/dto/pagination-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,

    private readonly appointmentsService: AppointmentsService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async issue(appointmentId: number, currentUser: UserPayload): Promise<Report> {
    const appointment = await this.appointmentsService.findOneInternal(appointmentId);

    if (appointment.type !== AppointmentType.EXAM) {
      throw new BadRequestException('Laudos só podem ser emitidos para atendimentos do tipo EXAM.');
    }

    if (appointment.status !== AppointmentStatus.FINISHED) {
      throw new BadRequestException('Laudos só podem ser emitidos para exames FINISHED.');
    }

    const exam = appointment as Exam;

    if (!exam.result) {
      throw new BadRequestException('O exame precisa possuir result preenchido para emissão de laudo.');
    }

    if (currentUser.type === UserType.DOCTOR && appointment.doctorId !== currentUser.sub) {
      throw new ForbiddenException('Você só pode emitir laudos dos seus próprios atendimentos.');
    }

    return this.dataSource.transaction(async (manager) => {
      const reportRepo = manager.getRepository(Report);

      const activeReport = await reportRepo.findOne({
        where: { appointmentId, status: ReportStatus.ACTIVE },
      });

      if (activeReport) {
        throw new ConflictException(
          `Já existe um laudo ACTIVE para o exame ${appointmentId}. Revogue o laudo atual antes de emitir outro.`,
        );
      }

      const report = reportRepo.create({
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        validationCode: randomUUID(),
        status: ReportStatus.ACTIVE,
        issuedAt: new Date(),
        issuedBy: currentUser.sub,
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
      });

      return reportRepo.save(report);
    });
  }

  async findOne(id: number, currentUser: UserPayload): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`Laudo com id ${id} não encontrado.`);
    }

    this.ensureCanAccess(report, currentUser);
    return report;
  }

  async validateByCode(code: string) {
    const report = await this.reportRepository.findOne({
      where: { validationCode: code },
    });

    if (!report) {
      throw new NotFoundException('Laudo não encontrado para o código informado.');
    }

    const appointment = await this.appointmentsService.findOneInternal(report.appointmentId);
    const exam = appointment as Exam;
    const doctor = await this.usersService.findDoctor(report.doctorId);
    const patient = await this.usersService.findPatient(report.patientId);

    return {
      validationCode: report.validationCode,
      status: report.status,
      issuedAt: report.issuedAt,
      patientName: patient.name,
      doctorName: doctor.name,
      examType: exam.examType,
      revokedAt: report.revokedAt,
      revokedReason: report.revokedReason,
    };
  }

  async revoke(
    id: number,
    dto: RevokeReportDto,
    currentUser: UserPayload,
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`Laudo com id ${id} não encontrado.`);
    }

    if (report.status === ReportStatus.REVOKED) {
      throw new BadRequestException('Este laudo já foi revogado.');
    }

    const canRevoke =
      currentUser.type === UserType.ADMIN ||
      (currentUser.type === UserType.DOCTOR && report.issuedBy === currentUser.sub);

    if (!canRevoke) {
      throw new ForbiddenException('Você não tem permissão para revogar este laudo.');
    }

    report.status = ReportStatus.REVOKED;
    report.revokedAt = new Date();
    report.revokedBy = currentUser.sub;
    report.revokedReason = dto.revokedReason;

    return this.reportRepository.save(report);
  }

  async getPdf(id: number, currentUser: UserPayload): Promise<Buffer> {
    const report = await this.findOne(id, currentUser);

    const appointment = await this.appointmentsService.findOneInternal(report.appointmentId);
    const exam = appointment as Exam;
    const doctor = await this.usersService.findDoctor(report.doctorId);
    const patient = await this.usersService.findPatient(report.patientId);

    return this.generatePdfBuffer({
      report,
      examType: exam.examType,
      result: exam.result,
      doctorName: doctor.name,
      patientName: patient.name,
    });
  }

  async findByPatient(
    patientId: number,
    query: FindReportsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<Report>> {
    if (currentUser.type === UserType.PATIENT && currentUser.sub !== patientId) {
      throw new ForbiddenException('Você só pode acessar seus próprios laudos.');
    }

    await this.usersService.findPatientOrFail(patientId);

    const { page = 1, limit = 20, sort } = query;

    const qb = this.reportRepository
      .createQueryBuilder('r')
      .where('r.patientId = :patientId', { patientId });

    if (currentUser.type === UserType.DOCTOR) {
      qb.andWhere('r.doctorId = :doctorId', { doctorId: currentUser.sub });
    }

    this.applySorting(qb, sort, 'r');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async findByDoctor(
    doctorId: number,
    query: FindReportsQueryDto,
    currentUser: UserPayload,
  ): Promise<PaginatedResult<Report>> {
    if (currentUser.type === UserType.DOCTOR && currentUser.sub !== doctorId) {
      throw new ForbiddenException('Você só pode acessar seus próprios laudos.');
    }

    await this.usersService.findDoctorOrFail(doctorId);

    const { page = 1, limit = 20, sort } = query;

    const qb = this.reportRepository
      .createQueryBuilder('r')
      .where('r.doctorId = :doctorId', { doctorId });

    this.applySorting(qb, sort, 'r');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async countByStatus(): Promise<{ status: string; count: number }[]> {
    return this.reportRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany();
  }

  private ensureCanAccess(report: Report, currentUser: UserPayload): void {
    if (currentUser.type === UserType.ADMIN) return;
    if (currentUser.type === UserType.DOCTOR && report.doctorId === currentUser.sub) return;
    if (currentUser.type === UserType.PATIENT && report.patientId === currentUser.sub) return;

    throw new ForbiddenException('Você não tem permissão para acessar este laudo.');
  }

  private generatePdfBuffer(data: {
    report: Report;
    examType: string;
    result: string;
    doctorName: string;
    patientName: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('SGCM — Laudo Médico', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Paciente: ${data.patientName}`);
      doc.text(`Médico: ${data.doctorName}`);
      doc.text(`Tipo de exame: ${data.examType}`);
      doc.text(`Data de emissão: ${data.report.issuedAt.toLocaleString('pt-BR')}`);
      doc.text(`Status: ${data.report.status}`);
      doc.moveDown();

      doc.fontSize(14).text('Resultado do Exame');
      doc.moveDown(0.5);
      doc.fontSize(12).text(data.result || 'Resultado não informado.');
      doc.moveDown();

      doc.fontSize(14).text('Código de Validação');
      doc.fontSize(12).text(data.report.validationCode);

      if (data.report.status === ReportStatus.REVOKED) {
        doc.moveDown();
        doc.fontSize(14).text('Laudo Revogado');
        doc.fontSize(12).text(`Motivo: ${data.report.revokedReason ?? 'Não informado.'}`);
      }

      doc.end();
    });
  }

  private applySorting(qb: any, sort: string | undefined, alias: string): void {
    const allowed = ['issuedAt', 'createdAt', 'status'];
    const [field, dir] = (sort ?? 'issuedAt:desc').split(':');
    const safeField = allowed.includes(field) ? field : 'issuedAt';
    qb.orderBy(`${alias}.${safeField}`, dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
  }
}