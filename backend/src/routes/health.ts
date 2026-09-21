import { Router } from 'express';
import { getDbState } from '../config/db';

const router = Router();

/** GET /api/health — no auth; reports service and database state. */
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    service: 'Bijayalakshmi Physiotherapy API',
    mongodb: getDbState(),
    time: new Date().toISOString(),
  });
});

export default router;
