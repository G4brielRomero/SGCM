import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { SchedulesModule } from './schedules/schedules.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'sgcm.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // apenas para dev — gera as tabelas automaticamente
    }),
    UsersModule,
    SpecialtiesModule,
    SchedulesModule,
  ],
})
export class AppModule {}