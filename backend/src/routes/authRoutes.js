import express from 'express';
import {
  requestRegister,
  verifyOtp,
  resendOtp,
  register,
  login,
  getMe,
  verifyAdminKey,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Email verification OTP flow
router.post('/register-request', requestRegister);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Legacy direct register & auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/verify', verifyAdminKey);

export default router;
