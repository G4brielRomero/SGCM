import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Procedure } from './entities/procedure.entity';
import { SimpleProcedure } from './entities/simple-procedure.entity';
import { SpecializedProcedure } from './entities/specialized-procedure.entity';
import { ProceduresService } from './procedures.service';
import { ProceduresController, AppointmentProceduresController } from './procedures.controller';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Procedure, SimpleProcedure, SpecializedProcedure]),
    AppointmentsModule,
  ],
  controllers: [ProceduresController, AppointmentProceduresController],
  providers: [ProceduresService],
  exports: [ProceduresService],
})
export class ProceduresModule {}
