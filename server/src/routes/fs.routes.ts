import { Router } from 'express';
import { FsController } from '../controllers/FsController';

const router = Router();

router.get('/list', FsController.list);
router.post('/pick-directory', FsController.pickDirectory);

export default router;
