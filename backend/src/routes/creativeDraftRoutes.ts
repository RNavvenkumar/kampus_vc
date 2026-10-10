import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import {
  listCreativeDrafts,
  getCreativeDraft,
  createCreativeDraft,
  updateCreativeDraft,
  deleteCreativeDraft,
  createCampaignBriefFromDraft
} from '../controllers/creativeDraftController';

const router = Router();

// All creative draft routes require authenticated brand/admin account
router.use(requireAuth);
router.use(requireRole('brand', 'admin'));

router.get('/', listCreativeDrafts);
router.post('/', createCreativeDraft);
router.get('/:draftId', getCreativeDraft);
router.patch('/:draftId', updateCreativeDraft);
router.delete('/:draftId', deleteCreativeDraft);
router.post('/:draftId/create-brief', createCampaignBriefFromDraft);

export const creativeDraftRoutes = router;
