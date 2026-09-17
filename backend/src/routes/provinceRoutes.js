import express from 'express';
import { getAllProvinces, getProvinceBySlug } from '../controllers/provinceController.js';

const router = express.Router();

router.get('/', getAllProvinces);
router.get('/:slug', getProvinceBySlug);

export default router;
