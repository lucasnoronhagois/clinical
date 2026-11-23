import { Router } from 'express';
import { UserController } from '../controllers';
import { requireRoot, requireStaff, validateSchema } from '../middlewares';
import { userSchema, userUpdateSchema } from '../schema';
import { action } from '../utils/bind';

const router = Router();
const controller = new UserController();

router.get('/', requireStaff, action(controller, 'list'));
router.get('/:id', requireStaff, action(controller, 'find'));
router.post('/', requireRoot, validateSchema(userSchema), action(controller, 'create'));
router.put('/:id', requireRoot, validateSchema(userUpdateSchema), action(controller, 'update'));
router.delete('/:id', requireRoot, action(controller, 'delete'));

export default router;
