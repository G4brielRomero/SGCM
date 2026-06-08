import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// ── Etapa 1 ───────────────────────────────────────────────────────────────────
import { User, UserType } from './modules/users/entities/user.entity';
import { Doctor } from './modules/users/entities/doctor.entity';
import { Patient } from './modules/users/entities/patient.entity';
import { Admin } from './modules/users/entities/admin.entity';
import { Specialty } from './modules/specialties/entities/specialty.entity';

// ── Etapa 2 ───────────────────────────────────────────────────────────────────
import { Schedule, ScheduleStatus } from './modules/schedules/entities/schedule.entity';
import { InPersonSchedule } from './modules/schedules/entities/in-person-schedule.entity';
import { OnlineSchedule } from './modules/schedules/entities/online-schedule.entity';
import { HomeSchedule } from './modules/schedules/entities/home-schedule.entity';

// ── Etapa 3 ───────────────────────────────────────────────────────────────────
import { Appointment, AppointmentStatus, AppointmentType } from './modules/appointments/entities/appointment.entity';
import { Consultation } from './modules/appointments/entities/consultation.entity';
import { Exam } from './modules/appointments/entities/exam.entity';
import { FollowUp } from './modules/appointments/entities/follow-up.entity';
import { Procedure, ProcedureType } from './modules/procedures/entities/procedure.entity';
import { SimpleProcedure } from './modules/procedures/entities/simple-procedure.entity';
import { SpecializedProcedure, AuthorizationStatus, ComplexityLevel } from './modules/procedures/entities/specialized-procedure.entity';
import { MedicalRecord } from './modules/medical-records/entities/medical-record.entity';
import { Report, ReportStatus } from './modules/reports/entities/report.entity';

const ds = new DataSource({
  type: 'sqlite',
  database: './database.db',
  entities: [
    User, Doctor, Patient, Admin,
    Specialty,
    Schedule, InPersonSchedule, OnlineSchedule, HomeSchedule,
    Appointment, Consultation, Exam, FollowUp,
    Procedure, SimpleProcedure, SpecializedProcedure,
    MedicalRecord,
    Report,
  ],
  synchronize: true,
});

const past = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
};
const future = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
};

async function seed() {
  await ds.initialize();
  const passwordHash = await bcrypt.hash('senha@123', 12);

  // ── Limpeza (ordem de dependência) ────────────────────────────────────────
  await ds.query('PRAGMA foreign_keys = OFF');
  for (const t of ['reports', 'medical_records', 'procedures', 'appointments', 'doctor_specialties', 'schedules', 'users', 'specialties']) {
    await ds.query(`DELETE FROM ${t}`).catch(() => undefined);
    await ds.query(`DELETE FROM sqlite_sequence WHERE name = '${t}'`).catch(() => undefined);
  }
  await ds.query('PRAGMA foreign_keys = ON');

  // ── Especialidades ────────────────────────────────────────────────────────
  const specRepo = ds.getRepository(Specialty);
  const cardiologia = await specRepo.save(specRepo.create({ name: 'Cardiologia', description: 'Especialidade voltada ao coração e sistema cardiovascular.' }));
  const dermatologia = await specRepo.save(specRepo.create({ name: 'Dermatologia', description: 'Especialidade voltada à pele, cabelo e unhas.' }));
  const ortopedia = await specRepo.save(specRepo.create({ name: 'Ortopedia', description: 'Especialidade voltada ao sistema músculo-esquelético.' }));

  // ── Usuários ──────────────────────────────────────────────────────────────
  const userRepo = ds.getRepository(User);
  const admin = await userRepo.save(userRepo.create({ name: 'Admin Sistema', email: 'admin@sgcm.com', password: passwordHash, type: UserType.ADMIN, isActive: true, refreshToken: null }));

  const doctorRepo = ds.getRepository(Doctor);
  const rafael = await doctorRepo.save(doctorRepo.create({ name: 'Dr. Rafael Mendes', email: 'rafael@sgcm.com', password: passwordHash, type: UserType.DOCTOR, crm: '12345-SP', isActive: true, refreshToken: null, specialties: [cardiologia, dermatologia] }));
  const ana = await doctorRepo.save(doctorRepo.create({ name: 'Dra. Ana Souza', email: 'ana@sgcm.com', password: passwordHash, type: UserType.DOCTOR, crm: '67890-RJ', isActive: true, refreshToken: null, specialties: [ortopedia] }));

  const patientRepo = ds.getRepository(Patient);
  const joao = await patientRepo.save(patientRepo.create({ name: 'João Silva', email: 'joao@email.com', password: passwordHash, type: UserType.PATIENT, cpf: '529.982.247-25', birthDate: '1990-03-15', isActive: true, refreshToken: null }));
  const maria = await patientRepo.save(patientRepo.create({ name: 'Maria Oliveira', email: 'maria@email.com', password: passwordHash, type: UserType.PATIENT, cpf: '390.533.447-05', birthDate: '1985-07-22', isActive: true, refreshToken: null }));

  // ── Agendamentos ──────────────────────────────────────────────────────────
  const inPRepo = ds.getRepository(InPersonSchedule);
  const onlRepo = ds.getRepository(OnlineSchedule);
  const homRepo = ds.getRepository(HomeSchedule);

  // PENDING — disponíveis para confirmar (PATCH /schedules/{id}/status)
  const s1 = await inPRepo.save(inPRepo.create({ scheduledAt: future(7), doctorId: rafael.id, patientId: joao.id, room: '101', unit: 'Unidade Central', status: ScheduleStatus.PENDING }));
  const s2 = await onlRepo.save(onlRepo.create({ scheduledAt: future(10), doctorId: ana.id, patientId: maria.id, accessLink: 'https://meet.google.com/abc-def', platform: 'Google Meet', status: ScheduleStatus.PENDING }));

  // CONFIRMED — disponíveis para criar atendimento (POST /appointments)
  const s3 = await inPRepo.save(inPRepo.create({ scheduledAt: future(3), doctorId: rafael.id, patientId: joao.id, room: '102', unit: 'Unidade Central', status: ScheduleStatus.CONFIRMED }));
  const s4 = await homRepo.save(homRepo.create({ scheduledAt: future(5), doctorId: ana.id, patientId: maria.id, fullAddress: 'Rua das Flores, 123, São Paulo - SP', accessNotes: 'Portão azul', status: ScheduleStatus.CONFIRMED }));

  // CANCELLED — demonstra cancelamento
  await onlRepo.save(onlRepo.create({ scheduledAt: future(14), doctorId: rafael.id, patientId: maria.id, accessLink: 'https://meet.google.com/xyz', platform: 'Zoom', status: ScheduleStatus.CANCELLED }));

  // COMPLETED — vinculados aos atendimentos abaixo
  const s6 = await inPRepo.save(inPRepo.create({ scheduledAt: past(5), doctorId: rafael.id, patientId: joao.id, room: '103', unit: 'Unidade Central', status: ScheduleStatus.COMPLETED }));
  const s7 = await inPRepo.save(inPRepo.create({ scheduledAt: past(10), doctorId: rafael.id, patientId: joao.id, room: '104', unit: 'Unidade Norte', status: ScheduleStatus.COMPLETED }));
  const s8 = await inPRepo.save(inPRepo.create({ scheduledAt: past(15), doctorId: ana.id, patientId: maria.id, room: '201', unit: 'Unidade Sul', status: ScheduleStatus.COMPLETED }));
  const s9 = await inPRepo.save(inPRepo.create({ scheduledAt: past(3), doctorId: rafael.id, patientId: joao.id, room: '105', unit: 'Unidade Central', status: ScheduleStatus.COMPLETED }));
  const s10 = await inPRepo.save(inPRepo.create({ scheduledAt: past(2), doctorId: rafael.id, patientId: joao.id, room: '106', unit: 'Unidade Central', status: ScheduleStatus.COMPLETED }));

  // ── Atendimentos (usando new + atribuição para STI funcionar corretamente) ─
  const consultRepo = ds.getRepository(Consultation);
  const examRepo = ds.getRepository(Exam);
  const followUpRepo = ds.getRepository(FollowUp);

  // a1 — CONSULTATION IN_PROGRESS (→ adicionar procedimentos, encerrar)
  const a1e = new Consultation();
  Object.assign(a1e, { type: AppointmentType.CONSULTATION, status: AppointmentStatus.IN_PROGRESS, scheduleId: s6.id, doctorId: rafael.id, patientId: joao.id, startedAt: past(5), reason: 'Dor torácica aos esforços há 1 semana', diagnosticHypothesis: null, notes: null });
  const a1 = await consultRepo.save(a1e);

  // a2 — CONSULTATION FINISHED (→ prontuário já criado)
  const a2e = new Consultation();
  Object.assign(a2e, { type: AppointmentType.CONSULTATION, status: AppointmentStatus.FINISHED, scheduleId: s7.id, doctorId: rafael.id, patientId: joao.id, startedAt: past(10), finishedAt: past(10), reason: 'Hipertensão arterial — avaliação inicial', diagnosticHypothesis: 'Hipertensão arterial estágio 1', notes: 'Paciente relata histórico familiar positivo' });
  const a2 = await consultRepo.save(a2e);

  // a3 — EXAM FINISHED com resultado (→ laudo ACTIVE, PDF, validação pública)
  const a3e = new Exam();
  Object.assign(a3e, { type: AppointmentType.EXAM, status: AppointmentStatus.FINISHED, scheduleId: s8.id, doctorId: ana.id, patientId: maria.id, startedAt: past(15), finishedAt: past(15), examType: 'Radiografia de coluna lombar', result: 'Escoliose leve com desvio lateral de 12 graus. Sem sinais de fratura ou lesão óssea aguda.', notes: null });
  const a3 = await examRepo.save(a3e);

  // a4 — EXAM FINISHED com resultado (→ laudo REVOGADO)
  const a4e = new Exam();
  Object.assign(a4e, { type: AppointmentType.EXAM, status: AppointmentStatus.FINISHED, scheduleId: s9.id, doctorId: rafael.id, patientId: joao.id, startedAt: past(3), finishedAt: past(3), examType: 'Eletrocardiograma de repouso', result: 'Ritmo sinusal regular. FC 72 bpm. Sem alterações isquêmicas.', notes: null });
  const a4 = await examRepo.save(a4e);

  // a5 — FOLLOW_UP FINISHED (→ retorno de a2, prontuário de acompanhamento)
  const a5e = new FollowUp();
  Object.assign(a5e, { type: AppointmentType.FOLLOW_UP, status: AppointmentStatus.FINISHED, scheduleId: s10.id, doctorId: rafael.id, patientId: joao.id, startedAt: past(2), finishedAt: past(2), originAppointmentId: a2.id, clinicalEvolution: 'Pressão arterial controlada após início da medicação. PA 130/85 mmHg.', notes: null });
  const a5 = await followUpRepo.save(a5e);

  // ── Procedimentos ─────────────────────────────────────────────────────────
  const simpRepo = ds.getRepository(SimpleProcedure);
  const specRepo2 = ds.getRepository(SpecializedProcedure);

  // p1 — SIMPLE em a1 IN_PROGRESS (→ excluir, atualizar)
  const p1e = new SimpleProcedure();
  Object.assign(p1e, { type: ProcedureType.SIMPLE, name: 'Ausculta cardiopulmonar', description: 'Avaliação dos sons cardíacos e pulmonares.', appointmentId: a1.id, estimatedDuration: 15 });
  await simpRepo.save(p1e);

  // p2 — SPECIALIZED PENDING em a1 IN_PROGRESS (→ autorizar/negar)
  const p2e = new SpecializedProcedure();
  Object.assign(p2e, { type: ProcedureType.SPECIALIZED, name: 'Ecocardiograma transtorácico', description: 'Avaliação funcional e estrutural do coração por ultrassom.', appointmentId: a1.id, requiredEquipment: 'Aparelho de ecocardiograma Philips EPIQ', complexityLevel: ComplexityLevel.MEDIUM, requiresAuthorization: true, authorizationStatus: AuthorizationStatus.PENDING, authorizedBy: null, authorizedAt: null, deniedReason: null });
  await specRepo2.save(p2e);

  // p3 — SPECIALIZED AUTHORIZED em a2 FINISHED (→ estado final já autorizado)
  const p3e = new SpecializedProcedure();
  Object.assign(p3e, { type: ProcedureType.SPECIALIZED, name: 'Holter 24 horas', description: 'Monitoramento contínuo do ritmo cardíaco por 24 horas.', appointmentId: a2.id, requiredEquipment: 'Monitor Holter digital', complexityLevel: ComplexityLevel.LOW, requiresAuthorization: true, authorizationStatus: AuthorizationStatus.AUTHORIZED, authorizedBy: admin.id, authorizedAt: past(10), deniedReason: null });
  await specRepo2.save(p3e);

  // ── Prontuários ───────────────────────────────────────────────────────────
  const recordRepo = ds.getRepository(MedicalRecord);

  // r1 — para a2 CONSULTATION FINISHED
  const r1e = new MedicalRecord();
  Object.assign(r1e, { appointmentId: a2.id, doctorId: rafael.id, patientId: joao.id, diagnosis: 'Hipertensão arterial primária estágio 1 (CID I10)', prescription: 'Losartana 50mg — 1 comprimido pela manhã\nHidroclorotiazida 25mg — 1 comprimido pela manhã', notes: 'Paciente orientado sobre dieta hipossódica e atividade física regular. Retorno em 30 dias.', lastUpdatedBy: null });
  await recordRepo.save(r1e);

  // r2 — para a5 FOLLOW_UP FINISHED
  const r2e = new MedicalRecord();
  Object.assign(r2e, { appointmentId: a5.id, doctorId: rafael.id, patientId: joao.id, diagnosis: 'Hipertensão arterial controlada — evolução favorável (CID I10)', prescription: 'Manter Losartana 50mg\nManter Hidroclorotiazida 25mg', notes: 'PA controlada. Paciente aderiu bem à medicação e dieta. Próximo retorno em 60 dias.', lastUpdatedBy: rafael.id });
  await recordRepo.save(r2e);

  // ── Laudos ────────────────────────────────────────────────────────────────
  const reportRepo = ds.getRepository(Report);

  // rep1 — ACTIVE para a3 (→ GET /reports/{id}/pdf, validação pública)
  const rep1e = new Report();
  Object.assign(rep1e, { appointmentId: a3.id, doctorId: ana.id, patientId: maria.id, validationCode: randomUUID(), status: ReportStatus.ACTIVE, issuedAt: past(15), issuedBy: ana.id, revokedAt: null, revokedBy: null, revokedReason: null });
  const rep1 = await reportRepo.save(rep1e);

  // rep2 — REVOKED para a4 (→ rastreabilidade de revogação)
  const rep2e = new Report();
  Object.assign(rep2e, { appointmentId: a4.id, doctorId: rafael.id, patientId: joao.id, validationCode: randomUUID(), status: ReportStatus.REVOKED, issuedAt: past(3), issuedBy: rafael.id, revokedAt: past(1), revokedBy: admin.id, revokedReason: 'Laudo emitido com identificação incorreta do paciente. Reemitido com correção.' });
  const rep2 = await reportRepo.save(rep2e);

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('✅ Seed concluído com sucesso!\n');
  console.log('── CREDENCIAIS (senha de todos: senha@123) ──────────────────');
  console.log(`ADMIN   id=${admin.id}  | admin@sgcm.com`);
  console.log(`DOCTOR  id=${rafael.id}  | rafael@sgcm.com  (Cardiologia, Dermatologia)`);
  console.log(`DOCTOR  id=${ana.id}  | ana@sgcm.com      (Ortopedia)`);
  console.log(`PATIENT id=${joao.id}  | joao@email.com`);
  console.log(`PATIENT id=${maria.id}  | maria@email.com`);
  console.log('\n── AGENDAMENTOS ─────────────────────────────────────────────');
  console.log(`s${s1.id}  IN_PERSON  PENDING    Rafael+João   → PATCH /schedules/${s1.id}/status {"status":"CONFIRMED"}`);
  console.log(`s${s2.id}  ONLINE     PENDING    Ana+Maria     → PATCH /schedules/${s2.id}/status {"status":"CONFIRMED"}`);
  console.log(`s${s3.id}  IN_PERSON  CONFIRMED  Rafael+João   → POST /appointments {"scheduleId":${s3.id},"type":"CONSULTATION",...}`);
  console.log(`s${s4.id}  HOME       CONFIRMED  Ana+Maria     → POST /appointments {"scheduleId":${s4.id},"type":"EXAM",...}`);
  console.log(`s5  ONLINE     CANCELLED  Rafael+Maria`);
  console.log('\n── ATENDIMENTOS ─────────────────────────────────────────────');
  console.log(`a${a1.id}  CONSULTATION  IN_PROGRESS  Rafael+João   → procedimentos, PATCH /appointments/${a1.id}/finish`);
  console.log(`a${a2.id}  CONSULTATION  FINISHED     Rafael+João   → prontuário criado, laudo NÃO aplicável`);
  console.log(`a${a3.id}  EXAM          FINISHED     Ana+Maria     → laudo ACTIVE (id=${rep1.id}), PDF, validação`);
  console.log(`a${a4.id}  EXAM          FINISHED     Rafael+João   → laudo REVOKED (id=${rep2.id})`);
  console.log(`a${a5.id}  FOLLOW_UP     FINISHED     Rafael+João   → retorno de a${a2.id}, prontuário criado`);
  console.log('\n── PROCEDIMENTOS em a1 (IN_PROGRESS) ───────────────────────');
  console.log(`  SIMPLE      Ausculta cardiopulmonar    → DELETE /procedures/{id}, PUT /procedures/{id}`);
  console.log(`  SPECIALIZED PENDING  Ecocardiograma   → PATCH /procedures/{id}/authorize ou /deny`);
  console.log('\n── LAUDOS ───────────────────────────────────────────────────');
  console.log(`rep${rep1.id}  ACTIVE   a${a3.id}  → GET /reports/${rep1.id}/pdf | GET /reports/validate/{code}`);
  console.log(`rep${rep2.id}  REVOKED  a${a4.id}  → POST /appointments/${a4.id}/report para novo laudo`);

  await ds.destroy();
}

seed().catch((error) => {
  console.error('❌ Erro ao executar seed:', error);
  process.exit(1);
});
