import { HttpError } from '../errors/HttpError';
import { Company } from '../models/index';

export type CompanyInput = {
  name: string;
  email: string;
  zip_code: string;
  adress_street: string;
  adress_number: string;
  adress_complement?: string | null;
  adress_neighborhood: string;
  adress_city: string;
  adress_state: string;
};

const NOT_FOUND = 'Clínica não encontrada.';

export default class CompanyService {
  async find(id: number | string) {
    const company = await Company.findOne({ where: { id, is_deleted: false } });
    if (!company) throw HttpError.notFound(NOT_FOUND);
    return company;
  }

  async list(onlyId?: number) {
    return Company.findAll({
      where: { is_deleted: false, ...(onlyId ? { id: onlyId } : {}) },
      order: [['name', 'ASC']],
    });
  }

  async create(data: CompanyInput) {
    return Company.create({ ...data, adress_complement: data.adress_complement || undefined, is_deleted: false });
  }

  async update(id: number | string, data: Partial<CompanyInput>) {
    const company = await this.find(id);
    await company.update(data);
    return company;
  }

  async delete(id: number | string) {
    const company = await this.find(id);
    await company.update({ is_deleted: true });
    return { message: 'Clínica excluída.' };
  }
}
