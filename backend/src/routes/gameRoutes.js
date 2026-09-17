import express from 'express';
import { getQuizzesByProvince, getAllPuzzles } from '../controllers/gameController.js';

const router = express.Router();

router.get('/quizzes', getQuizzesByProvince);
router.get('/puzzles', getAllPuzzles);

export default router;
