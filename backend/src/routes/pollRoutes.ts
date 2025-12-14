import express from 'express';
import {
  createPoll,
  getAllPolls,
  getPollById,
  castVote,
  getPollResults,
  checkUserVote,
  verifyVoteOnBlockchain,
} from '../controllers/pollController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, createPoll);
router.get('/', getAllPolls);
router.get('/:id', getPollById);
router.get('/:id/vote-status', authenticate, checkUserVote);
router.post('/vote', authenticate, castVote);
router.get('/:id/results', getPollResults);
router.get('/verify/:signature', verifyVoteOnBlockchain);

export default router;
