import { ChildEntity, Column } from 'typeorm';
import { Appointment, AppointmentType } from './appointment.entity';

@ChildEntity(AppointmentType.EXAM)
export class Exam extends Appointment {
  /** Tipo do exame (ex: eletrocardiograma, hemograma) — obrigatório na criação */
  @Column({ type: 'varchar' })
  examType: string;

  /**
   * Resultado do exame — opcional na criação.
   * Obrigatório para emissão de laudo.
   * Armazenado como TEXT para suportar resultados extensos.
   */
  @Column({ type: 'text', nullable: true })
  result: string;

  constructor() {
    super();
    this.type = AppointmentType.EXAM;
  }
}
