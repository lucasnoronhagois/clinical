import bcrypt from 'bcrypt';
import { Op, WhereOptions } from 'sequelize';
import { HttpError } from '../errors/HttpError';
import { User } from '../models/index';
import { UserRole } from '../types/auth';

export interface UserInput {
  name: string;
  email: string;
  login: string;
  password?: string;
  cpf: string;
  phone?: string;
  role: UserRole;
  root?: boolean;
  company_id: number;
}

export interface UserFilters {
  company_id?: number;
  name?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export const toPublicUser = (user: User) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = user.get({ plain: true });
  return rest;
};

const NOT_FOUND = 'Usuário não encontrado.';

export default class UserService {
  async findEntity(id: number | string): Promise<User> {
    const user = await User.findOne({ where: { id, is_deleted: false } });
    if (!user) throw HttpError.notFound(NOT_FOUND);
    return user;
  }

  async find(id: number | string) {
    return toPublicUser(await this.findEntity(id));
  }

  async list({ company_id, name, role, page, limit }: UserFilters) {
    const where: WhereOptions = { is_deleted: false };
    if (company_id) Object.assign(where, { company_id });
    if (name) Object.assign(where, { name: { [Op.like]: `%${name}%` } });
    if (role) Object.assign(where, { role });

    const paginate = Boolean(limit || page);
    const pageSize = Math.min(limit || 10, 1000);
    const currentPage = Math.max(page || 1, 1);

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
      ...(paginate ? { limit: pageSize, offset: (currentPage - 1) * pageSize } : {}),
    });

    return {
      users: rows,
      ...(paginate
        ? { pagination: { currentPage, totalPages: Math.ceil(count / pageSize), totalItems: count, itemsPerPage: pageSize } }
        : {}),
    };
  }

  private async ensureUnique(data: Pick<UserInput, 'email' | 'login' | 'cpf'>, ignoreId?: number) {
    const existing = await User.findOne({
      where: {
        [Op.or]: [{ email: data.email }, { login: data.login }, { cpf: data.cpf }],
        ...(ignoreId ? { id: { [Op.ne]: ignoreId } } : {}),
      },
    });
    if (!existing) return;
    const field = existing.login === data.login ? 'login' : existing.email === data.email ? 'email' : 'cpf';
    throw new HttpError(409, 'Email, login ou CPF já cadastrado.', [{ field, message: `${field} já cadastrado.` }]);
  }

  async create(data: UserInput) {
    if (!data.password) throw HttpError.badRequest('Senha é obrigatória.');
    await this.ensureUnique(data);

    const user = await User.create({
      ...data,
      phone: data.phone || undefined,
      password: await bcrypt.hash(data.password, 10),
      root: data.root ?? false,
      is_deleted: false,
    });
    return toPublicUser(user);
  }

  async update(id: number | string, data: Partial<UserInput>) {
    const user = await this.findEntity(id);
    await this.ensureUnique(
      { email: data.email ?? user.email, login: data.login ?? user.login, cpf: data.cpf ?? user.cpf },
      user.id,
    );

    const changes: Partial<UserInput> = { ...data };
    if (changes.password) {
      changes.password = await bcrypt.hash(changes.password, 10);
    } else {
      delete changes.password;
    }
    await user.update(changes);
    return toPublicUser(user);
  }

  async delete(id: number | string, currentUserId?: number) {
    const user = await this.findEntity(id);
    if (currentUserId && user.id === currentUserId) {
      throw HttpError.badRequest('Você não pode excluir o próprio usuário.');
    }
    await user.update({ is_deleted: true });
    return { message: 'Usuário excluído.' };
  }
}
