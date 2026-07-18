import { Router } from 'express';
import { register, login, googleLogin, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.get('/profile', authenticateToken, getProfile);

export default router;
