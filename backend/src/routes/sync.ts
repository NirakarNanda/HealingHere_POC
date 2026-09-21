import { Router } from 'express';
import { syncPatients } from '../controllers/syncController';
import { requireAuth } from '../middleware/requireAuth';
import { validate } from '../middleware/validate';
import { syncRequestSchema } from '../validation/schemas';

const router = Router();

router.post('/', requireAuth, validate(syncRequestSchema), syncPatients);

export default router;
