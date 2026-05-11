import { ChildEntity, Column, ManyToMany, OneToMany } from 'typeorm';
import { User, UserType } from './user.entity';
import { Specialty } from '../../specialties/entities/specialty.entity';

@ChildEntity(UserType.DOCTOR)
export class Doctor extends User {
  @Column({ unique: true, nullable: true })
  crm: string;

  @ManyToMany(() => Specialty, (specialty) => specialty.doctors, { eager: false })
  specialties: Specialty[];

  constructor() {
    super();
    this.type = UserType.DOCTOR;
  }
}
