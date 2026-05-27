import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  TableInheritance,
} from 'typeorm';
import { Doctor } from '../../users/entities/doctor.entity';
import { Patient } from '../../users/entities/patient.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  EXAM = 'EXAM',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum AppointmentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

@Entity('appointments')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  type: AppointmentType;

  @Column({ type: 'varchar', default: AppointmentStatus.IN_PROGRESS })
  status: AppointmentStatus;

  /** ID do agendamento que originou este atendimento (1:1) */
  @Column({ unique: true })
  scheduleId: number;

  /** Desnormalizado do agendamento para facilitar consultas */
  @Column()
  doctorId: number;

  @Column()
  patientId: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt: Date;

  @ManyToOne(() => Schedule, { eager: false, nullable: false })
  @JoinColumn({ name: 'scheduleId' })
  schedule: Schedule;

  @ManyToOne(() => Doctor, { eager: false, nullable: false })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @ManyToOne(() => Patient, { eager: false, nullable: false })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
