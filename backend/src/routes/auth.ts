import { Router } from 'express';
import { login, logout, me } from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validation/schemas';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
