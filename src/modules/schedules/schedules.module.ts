import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { InPersonSchedule } from './entities/in-person-schedule.entity';
import { OnlineSchedule } from './entities/online-schedule.entity';
import { HomeSchedule } from './entities/home-schedule.entity';
import { SchedulesService } from './schedules.service';
import { SchedulesController, DoctorSchedulesController, PatientSchedulesController } from './schedules.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, InPersonSchedule, OnlineSchedule, HomeSchedule]),
    UsersModule,
  ],
  controllers: [SchedulesController, DoctorSchedulesController, PatientSchedulesController],
  providers: [SchedulesService],
  // Exporta SchedulesService para o AppointmentsModule (Etapa 3)
  exports: [SchedulesService],
})
export class SchedulesModule {}
