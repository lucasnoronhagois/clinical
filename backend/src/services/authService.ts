import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Op } from 'sequelize';
import { config } from '../config/env';
import { HttpError } from '../errors/HttpError';
import { User } from '../models/index';
import { AuthUser } from '../types/auth';
import { toPublicUser } from './userService';

interface LoginCredentials {
  email_or_login: string;
  password: string;
}

// Hash usado quando o usuário não existe, para manter o tempo de resposta semelhante (mitiga timing attacks).
const DUMMY_HASH = bcrypt.hashSync('clinicalcare-dummy-password', 10);

export default class AuthService {
  async login({ email_or_login, password }: LoginCredentials) {
    const identifier = email_or_login.trim();
    const user = await User.findOne({
      where: {
        is_deleted: false,
        [Op.or]: [{ email: identifier.toLowerCase() }, { login: identifier }],
      },
    });

    const valid = await bcrypt.compare(password, user ? user.password.trim() : DUMMY_HASH);
    if (!user || !valid) {
      throw HttpError.unauthorized('Usuário ou senha inválidos.');
    }

    const payload: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      root: user.root,
      company_id: user.company_id,
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] });
    return { token, user: toPublicUser(user) };
  }

  async me(authUser: AuthUser) {
    const user = await User.findOne({ where: { id: authUser.id, is_deleted: false } });
    if (!user) throw HttpError.unauthorized('Usuário não encontrado.');
    return toPublicUser(user);
  }

  async changePassword(authUser: AuthUser, currentPassword: string, newPassword: string) {
    const user = await User.findOne({ where: { id: authUser.id, is_deleted: false } });
    if (!user) throw HttpError.unauthorized('Usuário não encontrado.');

    const valid = await bcrypt.compare(currentPassword, user.password.trim());
    if (!valid) throw HttpError.badRequest('Senha atual incorreta.');

    await user.update({ password: await bcrypt.hash(newPassword, 10) });
    return { message: 'Senha alterada com sucesso.' };
  }
}
