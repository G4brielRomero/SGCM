/**
 * seed.ts — popula o banco com dados de exemplo para todos os fluxos obrigatórios
 * Execute com: npx ts-node src/seed.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './modules/users/entities/user.entity';
import { Doctor } from './modules/users/entities/doctor.entity';
import { Patient } from './modules/users/entities/patient.entity';
import { Admin } from './modules/users/entities/admin.entity';
import { Specialty } from './modules/specialties/entities/specialty.entity';
import { InPersonSchedule } from './modules/schedules/entities/in-person-schedule.entity';
import { OnlineSchedule } from './modules/schedules/entities/online-schedule.entity';
import { HomeSchedule } from './modules/schedules/entities/home-schedule.entity';
import { Schedule, ScheduleStatus } from './modules/schedules/entities/schedule.entity';

const ds = new DataSource({
  type: 'sqlite',
  database: './database.db',
  entities: [User, Doctor, Patient, Admin, Specialty, Schedule, InPersonSchedule, OnlineSchedule, HomeSchedule],
  synchronize: true,
});

async function seed() {
  await ds.initialize();
  const SALT = 12;
  const pass = await bcrypt.hash('senha@123', SALT);

  // Especialidades
  const specRepo = ds.getRepository(Specialty);
  const cardio = specRepo.create({ name: 'Cardiologia', description: 'Doenças do coração e sistema cardiovascular.' });
  const dermato = specRepo.create({ name: 'Dermatologia', description: 'Pele, cabelo e unhas.' });
  const ortho = specRepo.create({ name: 'Ortopedia', description: 'Sistema músculo-esquelético.' });
  await specRepo.save([cardio, dermato, ortho]);

  // Admin
  const adminRepo = ds.getRepository(User);
  const admin = adminRepo.create({ name: 'Admin Sistema', email: 'admin@sgcm.com', password: pass, type: UserType.ADMIN, isActive: true });
  await adminRepo.save(admin);

  // Médicos
  const doctorRepo = ds.getRepository(Doctor);
  const dr1 = doctorRepo.create({ name: 'Dr. Rafael Mendes', email: 'rafael@sgcm.com', password: pass, crm: '12345-SP', specialties: [cardio, dermato], isActive: true });
  const dr2 = doctorRepo.create({ name: 'Dra. Ana Souza', email: 'ana@sgcm.com', password: pass, crm: '67890-RJ', specialties: [ortho], isActive: true });
  await doctorRepo.save([dr1, dr2]);

  // Pacientes
  const patientRepo = ds.getRepository(Patient);
  const p1 = patientRepo.create({ name: 'João Silva', email: 'joao@email.com', password: pass, cpf: '123.456.789-09', birthDate: '1990-03-15', isActive: true });
  const p2 = patientRepo.create({ name: 'Maria Oliveira', email: 'maria@email.com', password: pass, cpf: '987.654.321-00', birthDate: '1985-07-22', isActive: true });
  await patientRepo.save([p1, p2]);

  // Agendamentos
  const future1 = new Date(); future1.setDate(future1.getDate() + 7);
  const future2 = new Date(); future2.setDate(future2.getDate() + 14);
  const future3 = new Date(); future3.setDate(future3.getDate() + 3);

  const inPerson = ds.getRepository(InPersonSchedule).create({
    scheduledAt: future1, doctorId: dr1.id, patientId: p1.id,
    room: '102', unit: 'Unidade Central', status: ScheduleStatus.PENDING,
  });
  const online = ds.getRepository(OnlineSchedule).create({
    scheduledAt: future2, doctorId: dr2.id, patientId: p2.id,
    accessLink: 'https://meet.google.com/abc-xyz', platform: 'Google Meet', status: ScheduleStatus.CONFIRMED,
  });
  const home = ds.getRepository(HomeSchedule).create({
    scheduledAt: future3, doctorId: dr1.id, patientId: p2.id,
    fullAddress: 'Rua das Flores, 123, São Paulo - SP', accessNotes: 'Portão azul', status: ScheduleStatus.PENDING,
  });

  await ds.getRepository(InPersonSchedule).save(inPerson);
  await ds.getRepository(OnlineSchedule).save(online);
  await ds.getRepository(HomeSchedule).save(home);

  console.log('✅ Seed concluído com sucesso!');
  console.log('   Usuários: admin@sgcm.com, rafael@sgcm.com, ana@sgcm.com, joao@email.com, maria@email.com');
  console.log('   Senha de todos: senha@123');
  await ds.destroy();
}

seed().catch((e) => { console.error(e); process.exit(1); });
