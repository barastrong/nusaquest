import express from 'express';
import regionRoutes from './regionRoutes.js';
import provinceRoutes from './provinceRoutes.js';
import gameRoutes from './gameRoutes.js';
import userRoutes from './userRoutes.js';

const router = express.Router();

router.use('/regions', regionRoutes);
router.use('/provinces', provinceRoutes);
router.use('/games', gameRoutes);
router.use('/user', userRoutes);

export default router;
