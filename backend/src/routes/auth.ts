import { Router } from 'express';
import { AuthController } from '../controllers';
import { authenticateToken, validateSchema } from '../middlewares';
import { changePasswordSchema, loginSchema } from '../schema';
import { action } from '../utils/bind';

const router = Router();
const controller = new AuthController();

router.post('/login', validateSchema(loginSchema), action(controller, 'login'));
router.get('/me', authenticateToken, action(controller, 'me'));
router.post('/change-password', authenticateToken, validateSchema(changePasswordSchema), action(controller, 'changePassword'));

export default router;
