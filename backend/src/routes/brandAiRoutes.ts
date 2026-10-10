import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  getAIProviderStatus,
  generateBrief,
  generateDirections,
  analyzeMoodboard,
  synthesizeRequirements,
  improveDraft
} from '../controllers/brandAiController';

const router = Router();

// All brand AI routes require authenticated brand/admin account
router.use(requireAuth);
router.use(requireRole('brand', 'admin'));

router.get('/status', getAIProviderStatus);
router.post('/generate-brief', generateBrief);
router.post('/generate-directions', generateDirections);
router.post('/analyze-moodboard', analyzeMoodboard);
router.post('/synthesize-requirements', synthesizeRequirements);
router.post('/improve-draft', improveDraft);

export const brandAiRoutes = router;
