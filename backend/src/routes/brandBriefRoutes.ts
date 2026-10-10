import { Router } from 'express';
import {
  getMyBriefs,
  createBrief,
  getBriefById,
  updateBrief,
  publishBrief,
  pauseBrief,
  resumeBrief,
  archiveBrief,
  deleteBrief
} from '../controllers/brandBriefController.js';
import { getCampaignMatches } from '../controllers/matchingController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const brandBriefRouter = Router();

// All brand brief routes require authentication and 'brand' or 'admin' role
brandBriefRouter.use(requireAuth);
brandBriefRouter.use(requireRole('brand', 'admin'));

brandBriefRouter.get('/', getMyBriefs);
brandBriefRouter.post('/', createBrief);
brandBriefRouter.get('/:briefId', getBriefById);
brandBriefRouter.get('/:briefId/matches', getCampaignMatches);
brandBriefRouter.patch('/:briefId', updateBrief);
brandBriefRouter.post('/:briefId/publish', publishBrief);
brandBriefRouter.post('/:briefId/pause', pauseBrief);
brandBriefRouter.post('/:briefId/resume', resumeBrief);
brandBriefRouter.post('/:briefId/archive', archiveBrief);
brandBriefRouter.delete('/:briefId', deleteBrief);
