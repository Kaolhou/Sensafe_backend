import { Router } from 'express';
import {
  createRelationship,
  getRelationshipsByParentId,
  getRelationshipsByPatientId,
  getRelationship,
  deleteRelationship,
} from '../controllers/parent-patient.controller';

const router = Router();

router.post('/', createRelationship);
router.get('/parent/:parentId/patients', getRelationshipsByParentId);
router.get('/patient/:patientId/parents', getRelationshipsByPatientId);
router.get('/:parentId/:patientId', getRelationship);
router.delete('/:parentId/:patientId', deleteRelationship);

export default router;
