import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Admin } from './entities/admin.entity';
import { UsersService } from './users.service';
import { UsersController, DoctorsController, PatientsController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Doctor, Patient, Admin])],
  controllers: [UsersController, DoctorsController, PatientsController],
  providers: [UsersService],
  // Exporta UsersService para SchedulesModule e futuros módulos (Etapa 3)
  exports: [UsersService],
})
export class UsersModule {}
