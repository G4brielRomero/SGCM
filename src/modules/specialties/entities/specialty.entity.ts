import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Doctor } from '../../users/entities/doctor.entity';

@Entity('specialties')
export class Specialty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @ManyToMany(() => Doctor, (doctor) => doctor.specialties, { eager: false })
  @JoinTable({
    name: 'doctor_specialties',
    joinColumn: { name: 'specialtyId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'doctorId', referencedColumnName: 'id' },
  })
  doctors: Doctor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
