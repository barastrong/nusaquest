import express from 'express';
import regionRoutes from './regionRoutes.js';
import provinceRoutes from './provinceRoutes.js';
import gameRoutes from './gameRoutes.js';
import userRoutes from './userRoutes.js';
import guestRoutes from './guestRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/regions', regionRoutes);
router.use('/provinces', provinceRoutes);
router.use('/games', gameRoutes);
router.use('/user', userRoutes);
router.use('/guest', guestRoutes);

export default router;
