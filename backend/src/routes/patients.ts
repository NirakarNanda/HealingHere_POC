import { Router } from 'express';
import {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
} from '../controllers/patientController';
import { requireAuth } from '../middleware/requireAuth';
import { validate } from '../middleware/validate';
import { patientPayloadSchema } from '../validation/schemas';

const router = Router();

router.use(requireAuth);

router.get('/', listPatients);
router.get('/:id', getPatient);
router.post('/', validate(patientPayloadSchema), createPatient);
router.put('/:id', validate(patientPayloadSchema), updatePatient);

export default router;
