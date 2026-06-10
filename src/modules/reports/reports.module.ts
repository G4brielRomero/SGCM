import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportsService } from './reports.service';
import {
  ReportsController,
  DoctorReportsController,
  PatientReportsController,
} from './reports.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    AppointmentsModule,
    UsersModule,
  ],
  controllers: [
    ReportsController,
    DoctorReportsController,
    PatientReportsController,
  ],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}