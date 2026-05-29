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
import { Appointment } from '../../appointments/entities/appointment.entity';

export enum ProcedureType {
  SIMPLE = 'SIMPLE',
  SPECIALIZED = 'SPECIALIZED',
}

@Entity('procedures')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Procedure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  appointmentId: number;

  @Column({ type: 'varchar' })
  type: ProcedureType;

  @ManyToOne(() => Appointment, { eager: false, nullable: false })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
