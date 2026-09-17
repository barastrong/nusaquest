import express from 'express';
import {
  getAllProvinces,
  getProvinceBySlug,
  createProvince,
  updateProvince,
  deleteProvince,
  addCulture,
  updateCulture,
  deleteCulture,
  addTourism,
  updateTourism,
  deleteTourism,
  addCulinary,
  updateCulinary,
  deleteCulinary,
} from '../controllers/provinceController.js';

const router = express.Router();

router.get('/', getAllProvinces);
router.post('/', createProvince);
router.get('/:slug', getProvinceBySlug);
router.put('/:slug', updateProvince);
router.delete('/:slug', deleteProvince);

router.post('/:slug/cultures', addCulture);
router.put('/cultures/:id', updateCulture);
router.delete('/cultures/:id', deleteCulture);

router.post('/:slug/tourisms', addTourism);
router.put('/tourisms/:id', updateTourism);
router.delete('/tourisms/:id', deleteTourism);

router.post('/:slug/culinaries', addCulinary);
router.put('/culinaries/:id', updateCulinary);
router.delete('/culinaries/:id', deleteCulinary);

export default router;
