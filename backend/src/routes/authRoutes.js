import express from 'express';
import { verifyAdminKey } from '../controllers/authController.js';

const router = express.Router();

router.post('/verify', verifyAdminKey);

export default router;
