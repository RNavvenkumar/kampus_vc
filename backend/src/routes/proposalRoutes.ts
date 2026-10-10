import { Router } from 'express';
import {
  createProposal,
  getMyProposals,
  getProposalById,
  updateProposal,
  submitProposal,
  withdrawProposal
} from '../controllers/proposalController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const proposalRouter = Router();

// Creator authorization required
proposalRouter.use(requireAuth);
proposalRouter.use(requireRole('creator', 'admin'));

proposalRouter.post('/', createProposal);
proposalRouter.get('/', getMyProposals);
proposalRouter.get('/:proposalId', getProposalById);
proposalRouter.patch('/:proposalId', updateProposal);
proposalRouter.post('/:proposalId/submit', submitProposal);
proposalRouter.post('/:proposalId/withdraw', withdrawProposal);
