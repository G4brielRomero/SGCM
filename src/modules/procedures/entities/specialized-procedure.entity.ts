import { ChildEntity, Column } from 'typeorm';
import { Procedure, ProcedureType } from './procedure.entity';

export enum ComplexityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AuthorizationStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  DENIED = 'DENIED',
}

@ChildEntity(ProcedureType.SPECIALIZED)
export class SpecializedProcedure extends Procedure {
  @Column({ type: 'text' })
  requiredEquipment: string;

  @Column({ type: 'varchar' })
  complexityLevel: ComplexityLevel;

  @Column({ default: false })
  requiresAuthorization: boolean;

  @Column({ type: 'varchar', nullable: true })
  authorizationStatus: AuthorizationStatus | null;

  @Column({ nullable: true })
  authorizedBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  authorizedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  deniedReason: string | null;
}
