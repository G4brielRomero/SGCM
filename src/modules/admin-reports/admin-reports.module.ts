import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ProceduresModule } from '../procedures/procedures.module';
import { ReportsModule } from '../reports/reports.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { UsersModule } from '../users/users.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';

@Module({
    imports: [
        SchedulesModule,
        AppointmentsModule,
        ProceduresModule,
        ReportsModule,
        UsersModule,
    ],
    controllers: [AdminReportsController],
    providers: [AdminReportsService],
})
export class AdminReportsModule { }