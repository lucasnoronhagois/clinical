import { Request, Response } from 'express';
import DashboardService from '../services/dashboardService';
import { resolveCompanyId } from '../utils/tenant';

const dashboardService = new DashboardService();

export default class DashboardController {
  async getStatistics(req: Request, res: Response) {
    res.json(
      await dashboardService.getStatistics({
        company_id: resolveCompanyId(req.user!, req.query.company_id)!,
        start_date: typeof req.query.start_date === 'string' ? req.query.start_date : undefined,
        end_date: typeof req.query.end_date === 'string' ? req.query.end_date : undefined,
      }),
    );
  }
}
