import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './modules/users/entities/user.entity';
import { Doctor } from './modules/users/entities/doctor.entity';
import { Patient } from './modules/users/entities/patient.entity';
import { Admin } from './modules/users/entities/admin.entity';
import { Specialty } from './modules/specialties/entities/specialty.entity';
import { Schedule, ScheduleStatus } from './modules/schedules/entities/schedule.entity';
import { InPersonSchedule } from './modules/schedules/entities/in-person-schedule.entity';
import { OnlineSchedule } from './modules/schedules/entities/online-schedule.entity';
import { HomeSchedule } from './modules/schedules/entities/home-schedule.entity';

const ds = new DataSource({
  type: 'sqlite',
  database: './database.db',
  entities: [
    User,
    Doctor,
    Patient,
    Admin,
    Specialty,
    Schedule,
    InPersonSchedule,
    OnlineSchedule,
    HomeSchedule,
  ],
  synchronize: true,
});

async function seed() {
  await ds.initialize();

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('senha@123', saltRounds);

  const specialtyRepo = ds.getRepository(Specialty);
  const userRepo = ds.getRepository(User);
  const doctorRepo = ds.getRepository(Doctor);
  const patientRepo = ds.getRepository(Patient);
  const scheduleRepo = ds.getRepository(Schedule);

  await ds.query('PRAGMA foreign_keys = OFF');

  await ds.query('DELETE FROM doctor_specialties').catch(() => undefined);
  await scheduleRepo.clear();
  await userRepo.clear();
  await specialtyRepo.clear();

  await ds.query('PRAGMA foreign_keys = ON');

  const cardiologia = await specialtyRepo.save(
    specialtyRepo.create({
      name: 'Cardiologia',
      description: 'Especialidade voltada ao coração e sistema cardiovascular.',
    }),
  );

  const dermatologia = await specialtyRepo.save(
    specialtyRepo.create({
      name: 'Dermatologia',
      description: 'Especialidade voltada à pele, cabelo e unhas.',
    }),
  );

  const ortopedia = await specialtyRepo.save(
    specialtyRepo.create({
      name: 'Ortopedia',
      description: 'Especialidade voltada ao sistema músculo-esquelético.',
    }),
  );

  const admin = await userRepo.save(
    userRepo.create({
      name: 'Admin Sistema',
      email: 'admin@sgcm.com',
      password: passwordHash,
      type: UserType.ADMIN,
      isActive: true,
      refreshToken: null,
    }),
  );

  const doctor1 = await doctorRepo.save(
    doctorRepo.create({
      name: 'Dr. Rafael Mendes',
      email: 'rafael@sgcm.com',
      password: passwordHash,
      type: UserType.DOCTOR,
      crm: '12345-SP',
      isActive: true,
      refreshToken: null,
      specialties: [cardiologia, dermatologia],
    }),
  );

  const doctor2 = await doctorRepo.save(
    doctorRepo.create({
      name: 'Dra. Ana Souza',
      email: 'ana@sgcm.com',
      password: passwordHash,
      type: UserType.DOCTOR,
      crm: '67890-RJ',
      isActive: true,
      refreshToken: null,
      specialties: [ortopedia],
    }),
  );

  const patient1 = await patientRepo.save(
    patientRepo.create({
      name: 'João Silva',
      email: 'joao@email.com',
      password: passwordHash,
      type: UserType.PATIENT,
      cpf: '529.982.247-25',
      birthDate: '1990-03-15',
      isActive: true,
      refreshToken: null,
    }),
  );

  const patient2 = await patientRepo.save(
    patientRepo.create({
      name: 'Maria Oliveira',
      email: 'maria@email.com',
      password: passwordHash,
      type: UserType.PATIENT,
      cpf: '390.533.447-05',
      birthDate: '1985-07-22',
      isActive: true,
      refreshToken: null,
    }),
  );

  const future1 = new Date();
  future1.setDate(future1.getDate() + 7);

  const future2 = new Date();
  future2.setDate(future2.getDate() + 14);

  const future3 = new Date();
  future3.setDate(future3.getDate() + 21);

  await ds.getRepository(InPersonSchedule).save(
    ds.getRepository(InPersonSchedule).create({
      scheduledAt: future1,
      doctorId: doctor1.id,
      patientId: patient1.id,
      room: '102',
      unit: 'Unidade Central',
      status: ScheduleStatus.PENDING,
    }),
  );

  await ds.getRepository(OnlineSchedule).save(
    ds.getRepository(OnlineSchedule).create({
      scheduledAt: future2,
      doctorId: doctor2.id,
      patientId: patient2.id,
      accessLink: 'https://meet.google.com/abc-xyz',
      platform: 'Google Meet',
      status: ScheduleStatus.CONFIRMED,
    }),
  );

  await ds.getRepository(HomeSchedule).save(
    ds.getRepository(HomeSchedule).create({
      scheduledAt: future3,
      doctorId: doctor1.id,
      patientId: patient2.id,
      fullAddress: 'Rua das Flores, 123, São Paulo - SP',
      accessNotes: 'Portão azul',
      status: ScheduleStatus.PENDING,
    }),
  );

  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('Usuários criados:');
  console.log(`ADMIN   -> id ${admin.id} | admin@sgcm.com`);
  console.log(`DOCTOR  -> id ${doctor1.id} | rafael@sgcm.com`);
  console.log(`DOCTOR  -> id ${doctor2.id} | ana@sgcm.com`);
  console.log(`PATIENT -> id ${patient1.id} | joao@email.com`);
  console.log(`PATIENT -> id ${patient2.id} | maria@email.com`);
  console.log('');
  console.log('Senha de todos: senha@123');

  await ds.destroy();
}

seed().catch((error) => {
  console.error('❌ Erro ao executar seed:', error);
  process.exit(1);
});