import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Appointment } from '../../appointments/entities/appointment.entity';

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  appointmentId: number;

  /** Desnormalizados para facilitar consultas por médico e paciente */
  @Column()
  doctorId: number;

  @Column()
  patientId: number;

  @Column({ type: 'text' })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  prescription: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Preenchido automaticamente no update — nunca recebido do cliente */
  @Column({ nullable: true })
  lastUpdatedBy: number | null;

  @ManyToOne(() => Appointment, { eager: false, nullable: false })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
