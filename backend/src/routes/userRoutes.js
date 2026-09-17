import express from 'express';
import {
  getUserProgress,
  unlockProvince,
  recordGameScore,
  claimReward,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/progress/:deviceId', getUserProgress);
router.post('/unlock', unlockProvince);
router.post('/score', recordGameScore);
router.post('/claim', claimReward);

export default router;
