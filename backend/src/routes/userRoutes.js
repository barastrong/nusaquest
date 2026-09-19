import express from 'express';
import {
  getUserProgress,
  unlockProvince,
  recordGameScore,
  claimReward,
  getGameHistory,
  syncProgress,
} from '../controllers/userController.js';
import { authenticateToken, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/progress/:deviceId?', optionalAuth, getUserProgress);
router.post('/unlock', authenticateToken, unlockProvince);
router.post('/score', authenticateToken, recordGameScore);
router.post('/claim', authenticateToken, claimReward);
router.get('/history', authenticateToken, getGameHistory);
router.post('/sync', authenticateToken, syncProgress);

export default router;
