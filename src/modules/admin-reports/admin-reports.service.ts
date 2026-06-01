import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async schedules(startDate?: string, endDate?: string) {
    this.validateDateRange(startDate, endDate);

    const qb = this.dataSource
      .getRepository('schedules')
      .createQueryBuilder('s');

    this.applyDateFilter(qb, 's.scheduledAt', startDate, endDate);

    const byStatus = await qb
      .clone()
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.status')
      .getRawMany();

    const byType = await qb
      .clone()
      .select('s.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.type')
      .getRawMany();

    const total = await qb.clone().getCount();

    return {
      total,
      byStatus,
      byType,
    };
  }

  async appointments(startDate?: string, endDate?: string, doctorId?: number) {
    this.validateDateRange(startDate, endDate);

    const qb = this.dataSource
      .getRepository('appointments')
      .createQueryBuilder('a');

    this.applyDateFilter(qb, 'a.startedAt', startDate, endDate);

    if (doctorId) {
      qb.andWhere('a.doctorId = :doctorId', { doctorId });
    }

    const byType = await qb
      .clone()
      .select('a.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.type')
      .getRawMany();

    const byStatus = await qb
      .clone()
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany();

    const total = await qb.clone().getCount();

    return {
      total,
      byType,
      byStatus,
    };
  }

  async procedures(startDate?: string, endDate?: string) {
    this.validateDateRange(startDate, endDate);

    const qb = this.dataSource
      .getRepository('procedures')
      .createQueryBuilder('p');

    this.applyDateFilter(qb, 'p.createdAt', startDate, endDate);

    const byType = await qb
      .clone()
      .select('p.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.type')
      .getRawMany();

    const byAuthorizationStatus = await qb
      .clone()
      .select('p.authorizationStatus', 'authorizationStatus')
      .addSelect('COUNT(*)', 'count')
      .where('p.type = :type', { type: 'SPECIALIZED' })
      .groupBy('p.authorizationStatus')
      .getRawMany();

    const byComplexityLevel = await qb
      .clone()
      .select('p.complexityLevel', 'complexityLevel')
      .addSelect('COUNT(*)', 'count')
      .where('p.type = :type', { type: 'SPECIALIZED' })
      .groupBy('p.complexityLevel')
      .getRawMany();

    const total = await qb.clone().getCount();

    return {
      total,
      byType,
      byAuthorizationStatus,
      byComplexityLevel,
    };
  }

  async doctorOccupation(doctorId: number, startDate?: string, endDate?: string) {
    this.validateDateRange(startDate, endDate);

    const qb = this.dataSource
      .getRepository('schedules')
      .createQueryBuilder('s')
      .where('s.doctorId = :doctorId', { doctorId });

    this.applyDateFilter(qb, 's.scheduledAt', startDate, endDate);

    const total = await qb.clone().getCount();

    const byStatus = await qb
      .clone()
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.status')
      .getRawMany();

    const confirmedOrCompleted = await qb
      .clone()
      .andWhere('s.status IN (:...statuses)', {
        statuses: ['CONFIRMED', 'COMPLETED'],
      })
      .getCount();

    const occupationRate = total === 0 ? 0 : Number(((confirmedOrCompleted / total) * 100).toFixed(2));

    return {
      doctorId,
      total,
      byStatus,
      occupationRate,
      occupationRateFormula:
        '(CONFIRMED + COMPLETED) / total de agendamentos do médico no período',
    };
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate não pode ser posterior a endDate.');
    }
  }

  private applyDateFilter(qb: any, field: string, startDate?: string, endDate?: string): void {
    if (startDate) {
      qb.andWhere(`${field} >= :startDate`, { startDate: new Date(startDate) });
    }

    if (endDate) {
      qb.andWhere(`${field} <= :endDate`, { endDate: new Date(endDate) });
    }
  }
}