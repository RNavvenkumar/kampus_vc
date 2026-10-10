import { Router } from 'express';
import {
  getBrandProposals,
  getBrandProposalById,
  shortlistProposal,
  requestRevision,
  acceptProposal,
  declineProposal
} from '../controllers/brandProposalController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const brandProposalRouter = Router();

// Brand authorization required
brandProposalRouter.use(requireAuth);
brandProposalRouter.use(requireRole('brand', 'admin'));

brandProposalRouter.get('/', getBrandProposals);
brandProposalRouter.get('/:proposalId', getBrandProposalById);
brandProposalRouter.post('/:proposalId/shortlist', shortlistProposal);
brandProposalRouter.post('/:proposalId/request-revision', requestRevision);
brandProposalRouter.post('/:proposalId/accept', acceptProposal);
brandProposalRouter.post('/:proposalId/decline', declineProposal);
