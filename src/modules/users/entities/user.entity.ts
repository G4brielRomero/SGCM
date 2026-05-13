import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  TableInheritance,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserType {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
}

@Entity('users')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'varchar' })
  type: UserType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  @Exclude()
  refreshToken: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}