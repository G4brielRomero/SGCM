import { ChildEntity, Column } from 'typeorm';
import { Appointment, AppointmentType } from './appointment.entity';

@ChildEntity(AppointmentType.FOLLOW_UP)
export class FollowUp extends Appointment {
  /** Evolução clínica em relação ao atendimento anterior */
  @Column({ type: 'text', nullable: true })
  clinicalEvolution: string;

  /**
   * Referência ao atendimento anterior que originou este retorno.
   * Deve pertencer ao mesmo paciente. Validado no service.
   */
  @Column({ nullable: true })
  originAppointmentId: number;

  constructor() {
    super();
    this.type = AppointmentType.FOLLOW_UP;
  }
}
