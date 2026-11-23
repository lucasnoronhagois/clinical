import { Request, Response } from 'express';
import PatientService from '../services/patientService';
import { assertCompanyAccess, resolveCompanyId } from '../utils/tenant';

const patientService = new PatientService();
const NOT_FOUND = 'Paciente não encontrado.';

export default class PatientController {
  async list(req: Request, res: Response) {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    res.json(await patientService.list(resolveCompanyId(req.user!, req.query.company_id, false), search));
  }

  async find(req: Request, res: Response) {
    const patient = await patientService.find(req.params.id);
    assertCompanyAccess(req.user!, patient.company_id, NOT_FOUND);
    res.json(patient);
  }

  async create(req: Request, res: Response) {
    const company_id = resolveCompanyId(req.user!, req.body.company_id)!;
    res.status(201).json(await patientService.create({ ...req.body, company_id }));
  }

  async update(req: Request, res: Response) {
    const patient = await patientService.find(req.params.id);
    assertCompanyAccess(req.user!, patient.company_id, NOT_FOUND);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { company_id, ...changes } = req.body;
    res.json(await patientService.update(req.params.id, changes));
  }

  async delete(req: Request, res: Response) {
    const patient = await patientService.find(req.params.id);
    assertCompanyAccess(req.user!, patient.company_id, NOT_FOUND);
    res.json(await patientService.delete(req.params.id));
  }
}
