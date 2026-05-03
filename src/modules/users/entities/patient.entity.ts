import { ChildEntity, Column } from 'typeorm';
import { User, UserType } from './user.entity';

@ChildEntity(UserType.PATIENT)
export class Patient extends User {
  @Column({ unique: true, nullable: true })
  cpf: string;

  @Column({ type: 'date', nullable: true })
  birthDate: string;

  constructor() {
    super();
    this.type = UserType.PATIENT;
  }
}
