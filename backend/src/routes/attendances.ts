import { Router } from 'express';
import { AttendanceController } from '../controllers';
import { requireWriteAccess, validateSchema } from '../middlewares';
import { attendanceSchema } from '../schema';
import { action } from '../utils/bind';

const router = Router();
const controller = new AttendanceController();

router.get('/', action(controller, 'list'));
router.get('/:id', action(controller, 'find'));
router.post('/', requireWriteAccess, validateSchema(attendanceSchema), action(controller, 'create'));
router.put('/:id', requireWriteAccess, validateSchema(attendanceSchema), action(controller, 'update'));
router.put('/:id/confirm', requireWriteAccess, action(controller, 'confirm'));
router.put('/:id/finish', requireWriteAccess, action(controller, 'finish'));
router.delete('/:id', requireWriteAccess, action(controller, 'delete'));

export default router;
