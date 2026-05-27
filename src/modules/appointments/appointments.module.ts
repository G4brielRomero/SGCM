import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Consultation } from './entities/consultation.entity';
import { Exam } from './entities/exam.entity';
import { FollowUp } from './entities/follow-up.entity';
import { AppointmentsService } from './appointments.service';
import {
  AppointmentsController,
  DoctorAppointmentsController,
  PatientAppointmentsController,
} from './appointments.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Consultation, Exam, FollowUp]),
    UsersModule,
  ],
  controllers: [
    AppointmentsController,
    DoctorAppointmentsController,
    PatientAppointmentsController,
  ],
  providers: [AppointmentsService],
  /**
   * Exporta AppointmentsService para:
   * - ProceduresModule (verificar se atendimento está IN_PROGRESS)
   * - MedicalRecordsModule (verificar se atendimento está FINISHED)
   * - ReportsModule (verificar se Exam está FINISHED com result)
   * - AdminModule (agregações para relatórios)
   */
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
