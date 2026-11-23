import { HttpError } from '../errors/HttpError';
import { Place } from '../models/index';

export interface PlaceInput {
  name: string;
  company_id: number;
}

const NOT_FOUND = 'Local não encontrado.';

export default class PlaceService {
  async find(id: number | string) {
    const place = await Place.findOne({ where: { id, is_deleted: false } });
    if (!place) throw HttpError.notFound(NOT_FOUND);
    return place;
  }

  async list(companyId?: number) {
    return Place.findAll({
      where: { is_deleted: false, ...(companyId ? { company_id: companyId } : {}) },
      order: [['name', 'ASC']],
    });
  }

  async create(data: PlaceInput) {
    return Place.create({ ...data, is_deleted: false });
  }

  async update(id: number | string, data: Partial<PlaceInput>) {
    const place = await this.find(id);
    await place.update(data);
    return place;
  }

  async delete(id: number | string) {
    const place = await this.find(id);
    await place.update({ is_deleted: true });
    return { message: 'Local excluído.' };
  }
}
