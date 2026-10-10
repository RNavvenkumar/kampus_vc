import { Router } from 'express';
import {
  getMyCreatorProfile,
  updateMyCreatorProfile,
  saveCreatorOnboardingStep,
  completeCreatorOnboarding
} from '../controllers/creatorProfileController.js';
import {
  getMyPortfolio,
  createPortfolioItem,
  getPortfolioItemById,
  updatePortfolioItem,
  deletePortfolioItem,
  reorderPortfolio,
  toggleFeaturedItem
} from '../controllers/creatorPortfolioController.js';
import {
  getMyServices,
  createService,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceStatus,
  getAvailability,
  updateAvailability
} from '../controllers/creatorServiceController.js';
import {
  getCreatorOpportunities,
  getCreatorCampaignCompatibility
} from '../controllers/matchingController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const creatorProfileRouter = Router();

// All routes require authentication and 'creator' or 'admin' role
creatorProfileRouter.use(requireAuth);
creatorProfileRouter.use(requireRole('creator', 'admin'));

// Opportunities & Campaign Discovery
creatorProfileRouter.get('/opportunities', getCreatorOpportunities);
creatorProfileRouter.get('/opportunities/:briefId/compatibility', getCreatorCampaignCompatibility);

// Profile & Onboarding
creatorProfileRouter.get('/profile/me', getMyCreatorProfile);
creatorProfileRouter.patch('/profile/me', updateMyCreatorProfile);
creatorProfileRouter.post('/onboarding/step', saveCreatorOnboardingStep);
creatorProfileRouter.post('/onboarding/complete', completeCreatorOnboarding);

// Portfolio Management
creatorProfileRouter.get('/portfolio', getMyPortfolio);
creatorProfileRouter.post('/portfolio', createPortfolioItem);
creatorProfileRouter.patch('/portfolio/reorder', reorderPortfolio);
creatorProfileRouter.get('/portfolio/:itemId', getPortfolioItemById);
creatorProfileRouter.patch('/portfolio/:itemId', updatePortfolioItem);
creatorProfileRouter.delete('/portfolio/:itemId', deletePortfolioItem);
creatorProfileRouter.patch('/portfolio/:itemId/feature', toggleFeaturedItem);

// Service Catalog
creatorProfileRouter.get('/services', getMyServices);
creatorProfileRouter.post('/services', createService);
creatorProfileRouter.get('/services/:serviceId', getServiceById);
creatorProfileRouter.patch('/services/:serviceId', updateService);
creatorProfileRouter.delete('/services/:serviceId', deleteService);
creatorProfileRouter.patch('/services/:serviceId/status', toggleServiceStatus);

// Availability
creatorProfileRouter.get('/availability', getAvailability);
creatorProfileRouter.patch('/availability', updateAvailability);
