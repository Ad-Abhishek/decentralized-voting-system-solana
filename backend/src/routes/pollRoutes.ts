import express from 'express';
import {
  createPoll,
  getAllPolls,
  getPollById,
  castVote,
  getPollResults,
} from '../controllers/pollController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, createPoll);
router.get('/', getAllPolls);
router.get('/:id', getPollById);
router.post('/vote', authenticate, castVote);
router.get('/:id/results', getPollResults);

export default router;
