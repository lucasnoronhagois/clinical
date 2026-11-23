import { Request, Response } from 'express';
import UserService from '../services/userService';
import { assertCompanyAccess, resolveCompanyId } from '../utils/tenant';

const userService = new UserService();
const NOT_FOUND = 'Usuário não encontrado.';
const optionalNumber = (value: unknown) => (value === undefined || value === '' ? undefined : Number(value));

export default class UserController {
  async list(req: Request, res: Response) {
    res.json(
      await userService.list({
        company_id: resolveCompanyId(req.user!, req.query.company_id, false),
        name: typeof req.query.name === 'string' ? req.query.name : undefined,
        role: typeof req.query.role === 'string' ? req.query.role : undefined,
        page: optionalNumber(req.query.page),
        limit: optionalNumber(req.query.limit),
      }),
    );
  }

  async find(req: Request, res: Response) {
    const user = await userService.find(req.params.id);
    assertCompanyAccess(req.user!, user.company_id, NOT_FOUND);
    res.json(user);
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await userService.create(req.body));
  }

  async update(req: Request, res: Response) {
    res.json(await userService.update(req.params.id, req.body));
  }

  async delete(req: Request, res: Response) {
    res.json(await userService.delete(req.params.id, req.user!.id));
  }
}
