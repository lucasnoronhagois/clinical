import { Router } from 'express';
import { DashboardController } from '../controllers';
import { action } from '../utils/bind';

const router = Router();
const controller = new DashboardController();

router.get('/statistics', action(controller, 'getStatistics'));

export default router;
