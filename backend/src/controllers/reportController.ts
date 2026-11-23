import { Request, Response } from 'express';
import { HttpError } from '../errors/HttpError';
import ReportService from '../services/reportService';
import { resolveCompanyId } from '../utils/tenant';

const reportService = new ReportService();
const ROLES = ['DOCTOR', 'RECEPTIONIST', 'ALL'];

export default class ReportController {
  async getAttendanceReport(req: Request, res: Response) {
    const role = typeof req.query.role === 'string' && req.query.role ? req.query.role : 'DOCTOR';
    if (!ROLES.includes(role)) throw HttpError.badRequest('Perfil inválido para relatório.');
    res.json(
      await reportService.getAttendanceReport({
        company_id: resolveCompanyId(req.user!, req.query.company_id)!,
        role,
        start_date: typeof req.query.start_date === 'string' ? req.query.start_date : undefined,
        end_date: typeof req.query.end_date === 'string' ? req.query.end_date : undefined,
      }),
    );
  }
}
