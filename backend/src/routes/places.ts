import { Router } from 'express';
import { PlaceController } from '../controllers';
import { requireWriteAccess, validateSchema } from '../middlewares';
import { placeSchema } from '../schema';
import { action } from '../utils/bind';

const router = Router();
const controller = new PlaceController();

router.get('/', action(controller, 'list'));
router.get('/:id', action(controller, 'find'));
router.post('/', requireWriteAccess, validateSchema(placeSchema), action(controller, 'create'));
router.put('/:id', requireWriteAccess, validateSchema(placeSchema), action(controller, 'update'));
router.delete('/:id', requireWriteAccess, action(controller, 'delete'));

export default router;
