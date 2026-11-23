import { Op } from 'sequelize';
import { HttpError } from '../errors/HttpError';
import { Patient } from '../models/index';

export interface PatientInput {
  name: string;
  cpf?: string | null;
  birth_date: string;
  company_id: number;
}

const NOT_FOUND = 'Paciente não encontrado.';

export default class PatientService {
  async find(id: number | string) {
    const patient = await Patient.findOne({ where: { id, is_deleted: false } });
    if (!patient) throw HttpError.notFound(NOT_FOUND);
    return patient;
  }

  async list(companyId?: number, search?: string) {
    return Patient.findAll({
      where: {
        is_deleted: false,
        ...(companyId ? { company_id: companyId } : {}),
        ...(search ? { [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { cpf: { [Op.like]: `%${search.replace(/\D/g, '') || search}%` } }] } : {}),
      },
      order: [['name', 'ASC']],
    });
  }

  private normalize({ birth_date, cpf, ...rest }: Partial<PatientInput>) {
    return {
      ...rest,
      ...(birth_date ? { birth_date: new Date(birth_date) } : {}),
      ...(cpf !== undefined ? { cpf: cpf || null } : {}),
    };
  }

  async create(data: PatientInput) {
    return Patient.create({ ...data, birth_date: new Date(data.birth_date), cpf: data.cpf || null, is_deleted: false });
  }

  async update(id: number | string, data: Partial<PatientInput>) {
    const patient = await this.find(id);
    await patient.update(this.normalize(data));
    return patient;
  }

  async delete(id: number | string) {
    const patient = await this.find(id);
    await patient.update({ is_deleted: true });
    return { message: 'Paciente excluído.' };
  }
}
