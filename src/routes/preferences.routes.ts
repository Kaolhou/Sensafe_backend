import {
  getUserPreferences,
  updateUserPreferences,
} from '../controllers/preferences.controller';
import { isLogged } from '../middleware/auth.middleware';
import { Router } from 'express';

const router = Router();

router.patch('/', isLogged, updateUserPreferences);
router.get('/', isLogged, getUserPreferences);

export default router;
