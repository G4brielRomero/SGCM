import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum ReportStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

@Entity('reports')
@Index('uq_active_report_by_appointment', ['appointmentId'], {
  unique: true,
  where: `status = 'ACTIVE'`,
})
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  appointmentId: number;

  @Column()
  doctorId: number;

  @Column()
  patientId: number;

  @Column({ type: 'varchar', unique: true })
  validationCode: string;

  @Column({ type: 'varchar', default: ReportStatus.ACTIVE })
  status: ReportStatus;

  @Column({ type: 'datetime' })
  issuedAt: Date;

  @Column()
  issuedBy: number;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @Column({ nullable: true })
  revokedBy: number | null;

  @Column({ type: 'text', nullable: true })
  revokedReason: string | null;

  @ManyToOne(() => Appointment, { eager: false, nullable: false })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}