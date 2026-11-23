import { Request, Response } from 'express';
import PlaceService from '../services/placeService';
import { assertCompanyAccess, resolveCompanyId } from '../utils/tenant';

const placeService = new PlaceService();
const NOT_FOUND = 'Local não encontrado.';

export default class PlaceController {
  async list(req: Request, res: Response) {
    res.json(await placeService.list(resolveCompanyId(req.user!, req.query.company_id, false)));
  }

  async find(req: Request, res: Response) {
    const place = await placeService.find(req.params.id);
    assertCompanyAccess(req.user!, place.company_id, NOT_FOUND);
    res.json(place);
  }

  async create(req: Request, res: Response) {
    const company_id = resolveCompanyId(req.user!, req.body.company_id)!;
    res.status(201).json(await placeService.create({ ...req.body, company_id }));
  }

  async update(req: Request, res: Response) {
    const place = await placeService.find(req.params.id);
    assertCompanyAccess(req.user!, place.company_id, NOT_FOUND);
    res.json(await placeService.update(req.params.id, { name: req.body.name }));
  }

  async delete(req: Request, res: Response) {
    const place = await placeService.find(req.params.id);
    assertCompanyAccess(req.user!, place.company_id, NOT_FOUND);
    res.json(await placeService.delete(req.params.id));
  }
}
