import express from 'express';
import {
  getQuizzesByProvince,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAllPuzzles,
  createPuzzle,
  updatePuzzle,
  deletePuzzle,
} from '../controllers/gameController.js';

const router = express.Router();

router.get('/quizzes', getQuizzesByProvince);
router.post('/quizzes', createQuiz);
router.put('/quizzes/:id', updateQuiz);
router.delete('/quizzes/:id', deleteQuiz);

router.get('/puzzles', getAllPuzzles);
router.post('/puzzles', createPuzzle);
router.put('/puzzles/:id', updatePuzzle);
router.delete('/puzzles/:id', deletePuzzle);

export default router;
