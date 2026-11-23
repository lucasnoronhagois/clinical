import { Request, Response } from 'express';
import CompanyService from '../services/companyService';
import { assertCompanyAccess, canAccessAllCompanies } from '../utils/tenant';

const companyService = new CompanyService();
const NOT_FOUND = 'Clínica não encontrada.';

export default class CompanyController {
  async list(req: Request, res: Response) {
    const user = req.user!;
    res.json(await companyService.list(canAccessAllCompanies(user) ? undefined : user.company_id));
  }

  async find(req: Request, res: Response) {
    assertCompanyAccess(req.user!, Number(req.params.id), NOT_FOUND);
    res.json(await companyService.find(req.params.id));
  }

  async create(req: Request, res: Response) {
    res.status(201).json(await companyService.create(req.body));
  }

  async update(req: Request, res: Response) {
    res.json(await companyService.update(req.params.id, req.body));
  }

  async delete(req: Request, res: Response) {
    res.json(await companyService.delete(req.params.id));
  }
}
