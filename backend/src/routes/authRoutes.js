import express from 'express';
import { register, login, getMe, verifyAdminKey } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/verify', verifyAdminKey);

export default router;
