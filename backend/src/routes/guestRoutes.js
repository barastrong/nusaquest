import express from 'express';
import {
  getGuestProgress,
  syncGuestProgress,
  unlockGuestProvince,
  recordGuestScore,
  claimGuestReward,
  markGuestWarningSeen,
  resetGuestProgress,
} from '../controllers/guestController.js';

/**
 * Route Mode Tamu. Semua endpoint di sini di-scope oleh `deviceId`
 * (bukan JWT), karena tamu tidak punya akun.
 */
const router = express.Router();

router.get('/progress/:deviceId', getGuestProgress);
router.delete('/progress/:deviceId', resetGuestProgress);
router.post('/sync', syncGuestProgress);
router.post('/unlock', unlockGuestProvince);
router.post('/score', recordGuestScore);
router.post('/claim', claimGuestReward);
router.post('/warning-seen', markGuestWarningSeen);

export default router;
