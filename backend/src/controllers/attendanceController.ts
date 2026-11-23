import { Request, Response } from 'express';
import AttendanceService from '../services/attendanceService';
import { assertCompanyAccess, resolveCompanyId } from '../utils/tenant';

const attendanceService = new AttendanceService();
const NOT_FOUND = 'Atendimento não encontrado.';
const optionalNumber = (value: unknown) => (value === undefined || value === '' ? undefined : Number(value));
const optionalString = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

export default class AttendanceController {
  async list(req: Request, res: Response) {
    res.json(
      await attendanceService.list({
        company_id: resolveCompanyId(req.user!, req.query.company_id, false),
        patient_id: optionalNumber(req.query.patient_id ?? req.query.patientId),
        from: optionalString(req.query.from),
        to: optionalString(req.query.to),
      }),
    );
  }

  private async load(req: Request) {
    const attendance = await attendanceService.find(req.params.id);
    assertCompanyAccess(req.user!, attendance.company_id, NOT_FOUND);
    return attendance;
  }

  async find(req: Request, res: Response) {
    res.json(await this.load(req));
  }

  async create(req: Request, res: Response) {
    const company_id = resolveCompanyId(req.user!, req.body.company_id)!;
    res.status(201).json(await attendanceService.create({ ...req.body, company_id }, req.user!));
  }

  async update(req: Request, res: Response) {
    const attendance = await this.load(req);
    res.json(await attendanceService.update(attendance.id, { ...req.body, company_id: attendance.company_id }));
  }

  async confirm(req: Request, res: Response) {
    const attendance = await this.load(req);
    res.json(await attendanceService.confirm(attendance.id, req.user!));
  }

  async finish(req: Request, res: Response) {
    const attendance = await this.load(req);
    res.json(await attendanceService.finish(attendance.id, req.user!));
  }

  async delete(req: Request, res: Response) {
    const attendance = await this.load(req);
    res.json(await attendanceService.delete(attendance.id));
  }
}
