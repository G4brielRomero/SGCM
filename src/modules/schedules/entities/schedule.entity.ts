import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  TableInheritance,
  Index,
} from 'typeorm';
import { Doctor } from '../../users/entities/doctor.entity';
import { Patient } from '../../users/entities/patient.entity';

export enum ScheduleType {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
  HOME = 'HOME',
}

export enum ScheduleStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

// Transições de status permitidas
export const ALLOWED_TRANSITIONS: Record<ScheduleStatus, ScheduleStatus[]> = {
  [ScheduleStatus.PENDING]: [ScheduleStatus.CONFIRMED, ScheduleStatus.CANCELLED],
  [ScheduleStatus.CONFIRMED]: [ScheduleStatus.CANCELLED, ScheduleStatus.COMPLETED],
  [ScheduleStatus.CANCELLED]: [],
  [ScheduleStatus.COMPLETED]: [],
};

@Entity('schedules')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
@Index('uq_schedule_doctor_confirmed_time', ['doctorId', 'scheduledAt'], {
  unique: true,
  where: `status = 'CONFIRMED'`,
})
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime' })
  scheduledAt: Date;

  @Column({ type: 'varchar', default: ScheduleStatus.PENDING })
  status: ScheduleStatus;

  @Column({ type: 'varchar' })
  type: ScheduleType;

  @Column()
  doctorId: number;

  @Column()
  patientId: number;

  @ManyToOne(() => Doctor, { eager: false, nullable: false })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @ManyToOne(() => Patient, { eager: false, nullable: false })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // será feito na parte 2
  @Column({ nullable: true })
  cancelledBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
