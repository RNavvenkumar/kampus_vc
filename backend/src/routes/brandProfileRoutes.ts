import { Router } from 'express';
import {
  getMyBrandProfile,
  updateMyBrandProfile,
  saveBrandOnboardingStep,
  completeBrandOnboarding
} from '../controllers/brandProfileController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const brandProfileRouter = Router();

// All routes require authentication and 'brand' role
brandProfileRouter.use(requireAuth);
brandProfileRouter.use(requireRole('brand', 'admin'));

brandProfileRouter.get('/profile/me', getMyBrandProfile);
brandProfileRouter.patch('/profile/me', updateMyBrandProfile);
brandProfileRouter.post('/onboarding/step', saveBrandOnboardingStep);
brandProfileRouter.post('/onboarding/complete', completeBrandOnboarding);
