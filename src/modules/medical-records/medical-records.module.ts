import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsService } from './medical-records.service';
import {
  MedicalRecordsController,
  AppointmentRecordController,
  PatientRecordsController,
  DoctorRecordsController,
} from './medical-records.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalRecord]),
    AppointmentsModule,
    UsersModule,
  ],
  controllers: [
    MedicalRecordsController,
    AppointmentRecordController,
    PatientRecordsController,
    DoctorRecordsController,
  ],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
