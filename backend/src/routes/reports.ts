import { Router } from 'express';
import { ReportController } from '../controllers';
import { action } from '../utils/bind';

const router = Router();
const controller = new ReportController();

router.get('/attendances', action(controller, 'getAttendanceReport'));

export default router;
