import { Router } from 'express';
import { CompanyController } from '../controllers';
import { requireRoot, validateSchema } from '../middlewares';
import { companySchema } from '../schema';
import { action } from '../utils/bind';

const router = Router();
const controller = new CompanyController();

router.get('/', action(controller, 'list'));
router.get('/:id', action(controller, 'find'));
router.post('/', requireRoot, validateSchema(companySchema), action(controller, 'create'));
router.put('/:id', requireRoot, validateSchema(companySchema), action(controller, 'update'));
router.delete('/:id', requireRoot, action(controller, 'delete'));

export default router;
