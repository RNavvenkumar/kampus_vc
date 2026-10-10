import { Router } from 'express';
import { register, login, logout, getMe, changePassword, googleAuth } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.post('/google', authLimiter, googleAuth);
authRouter.post('/logout', requireAuth, logout);
authRouter.get('/me', requireAuth, getMe);
authRouter.post('/change-password', requireAuth, authLimiter, changePassword);

