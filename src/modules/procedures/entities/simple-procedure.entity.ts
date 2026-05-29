import { ChildEntity, Column } from 'typeorm';
import { Procedure, ProcedureType } from './procedure.entity';

@ChildEntity(ProcedureType.SIMPLE)
export class SimpleProcedure extends Procedure {
  @Column({ type: 'int' })
  estimatedDuration: number;
}
