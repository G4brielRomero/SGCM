import { ChildEntity, Column } from 'typeorm';
import { Appointment, AppointmentType } from './appointment.entity';

@ChildEntity(AppointmentType.CONSULTATION)
export class Consultation extends Appointment {
  /** Motivo da consulta — obrigatório na criação */
  @Column({ type: 'text' })
  reason: string;

  /** Hipótese diagnóstica — opcional, preenchida durante o atendimento */
  @Column({ type: 'text', nullable: true })
  diagnosticHypothesis: string;

  constructor() {
    super();
    this.type = AppointmentType.CONSULTATION;
  }
}
