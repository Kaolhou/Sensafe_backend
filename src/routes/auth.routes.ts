import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';
import { isLogged } from '../middleware/auth.middleware';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../controllers/preferences.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/user/preferences', isLogged, updateUserPreferences);
router.get('/user/preferences', isLogged, getUserPreferences);

export default router;
