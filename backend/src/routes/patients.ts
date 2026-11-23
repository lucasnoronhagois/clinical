import { Router } from 'express';
import { PatientController } from '../controllers';
import { requireWriteAccess, validateSchema } from '../middlewares';
import { patientSchema } from '../schema';
import { action } from '../utils/bind';

const router = Router();
const controller = new PatientController();

router.get('/', action(controller, 'list'));
router.get('/:id', action(controller, 'find'));
router.post('/', requireWriteAccess, validateSchema(patientSchema), action(controller, 'create'));
router.put('/:id', requireWriteAccess, validateSchema(patientSchema), action(controller, 'update'));
router.delete('/:id', requireWriteAccess, action(controller, 'delete'));

export default router;
