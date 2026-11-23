import { Op, WhereOptions } from 'sequelize';
import { HttpError } from '../errors/HttpError';
import { Attendance, Patient, Place, User } from '../models/index';
import { AuthUser } from '../types/auth';

export type AttendanceStatus = 'scheduled' | 'confirmed' | 'finished';

export interface AttendanceInput {
  user_id: number;
  company_id: number;
  start_date: string;
  patient_id: number;
  place_id: number;
}

export interface AttendanceFilters {
  company_id?: number;
  patient_id?: number;
  from?: string;
  to?: string;
}

const NOT_FOUND = 'Atendimento não encontrado.';

export const getAttendanceStatus = (attendance: Pick<Attendance, 'confirmed_at' | 'end_date'>): AttendanceStatus => {
  if (attendance.end_date) return 'finished';
  if (attendance.confirmed_at) return 'confirmed';
  return 'scheduled';
};

const includes = [
  { association: 'patient', attributes: ['id', 'name', 'cpf'] },
  { association: 'user', attributes: ['id', 'name', 'role'] },
  { association: 'receptionist', attributes: ['id', 'name'] },
  { association: 'place', attributes: ['id', 'name'] },
];

export default class AttendanceService {
  async find(id: number | string) {
    const attendance = await Attendance.findOne({ where: { id, is_deleted: false }, include: includes });
    if (!attendance) throw HttpError.notFound(NOT_FOUND);
    return attendance;
  }

  async list({ company_id, patient_id, from, to }: AttendanceFilters) {
    const where: WhereOptions = { is_deleted: false };
    if (company_id) Object.assign(where, { company_id });
    if (patient_id) Object.assign(where, { patient_id });
    if (from || to) {
      Object.assign(where, {
        start_date: {
          ...(from ? { [Op.gte]: new Date(from) } : {}),
          ...(to ? { [Op.lte]: new Date(to) } : {}),
        },
      });
    }
    return Attendance.findAll({ where, include: includes, order: [['start_date', 'DESC']] });
  }

  /** Garante que paciente, local e profissional pertencem à mesma clínica do atendimento. */
  private async assertRelations(data: AttendanceInput) {
    const [patient, place, doctor] = await Promise.all([
      Patient.findOne({ where: { id: data.patient_id, is_deleted: false } }),
      Place.findOne({ where: { id: data.place_id, is_deleted: false } }),
      User.findOne({ where: { id: data.user_id, is_deleted: false } }),
    ]);
    const details = [];
    if (!patient || patient.company_id !== Number(data.company_id)) details.push({ field: 'patient_id', message: 'Paciente não pertence a esta clínica.' });
    if (!place || place.company_id !== Number(data.company_id)) details.push({ field: 'place_id', message: 'Local não pertence a esta clínica.' });
    if (!doctor || doctor.company_id !== Number(data.company_id)) details.push({ field: 'user_id', message: 'Profissional não pertence a esta clínica.' });
    if (details.length) throw HttpError.badRequest('Dados inválidos', details);
  }

  async create(data: AttendanceInput, author: AuthUser) {
    await this.assertRelations(data);
    const attendance = await Attendance.create({
      ...data,
      start_date: new Date(data.start_date),
      receptionist_id: author.role === 'RECEPTIONIST' ? author.id : undefined,
      is_deleted: false,
    });
    return this.find(attendance.id);
  }

  async update(id: number | string, data: AttendanceInput) {
    const attendance = await this.find(id);
    if (attendance.end_date) throw HttpError.conflict('Atendimentos finalizados não podem ser editados.');
    await this.assertRelations(data);
    await attendance.update({ ...data, start_date: new Date(data.start_date) });
    return this.find(attendance.id);
  }

  async confirm(id: number | string, author: AuthUser) {
    const attendance = await this.find(id);
    if (attendance.confirmed_at) throw HttpError.conflict('Atendimento já confirmado.');
    await attendance.update({ confirmed_at: new Date(), confirmed_by: author.id });
    return this.find(attendance.id);
  }

  async finish(id: number | string) {
    const attendance = await this.find(id);
    if (attendance.end_date) throw HttpError.conflict('Atendimento já finalizado.');
    if (!attendance.confirmed_at) throw HttpError.conflict('Confirme o atendimento antes de finalizar.');
    await attendance.update({ end_date: new Date() });
    return this.find(attendance.id);
  }

  async delete(id: number | string) {
    const attendance = await this.find(id);
    await attendance.update({ is_deleted: true });
    return { message: 'Atendimento excluído.' };
  }
}
