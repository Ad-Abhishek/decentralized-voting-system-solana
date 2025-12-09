import express from 'express';
import { register, login, updateWallet } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/wallet', authenticate, updateWallet);

export default router;
