import { Router } from 'express';
import {
  getMyProjects,
  getProjectById,
  updateProjectStatus,
  getProjectMilestones,
  updateMilestoneStatus,
  submitDeliverable,
  getMilestoneSubmissions,
  reviewSubmission,
  getProjectMessages,
  sendProjectMessage,
  getProjectActivity,
  getProjectFiles,
  getProjectHistory,
  submitProjectReview,
  getCreatorReviews,
  getBrandReviews
} from '../controllers/projectController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { PaymentController } from '../controllers/paymentController.js';

export const projectRouter = Router();

// All project workspace operations require active authentication
projectRouter.use(requireAuth);

// Project Collaboration History & Reviews (Must precede /:projectId)
projectRouter.get('/history', getProjectHistory);
projectRouter.get('/brand/reviews', getBrandReviews);
projectRouter.get('/creators/:creatorId/reviews', getCreatorReviews);

// Project Workspace & Status
projectRouter.get('/', getMyProjects);
projectRouter.get('/:projectId', getProjectById);
projectRouter.patch('/:projectId/status', updateProjectStatus);
projectRouter.post('/:projectId/review', submitProjectReview);

// Milestone Tracking
projectRouter.get('/:projectId/milestones', getProjectMilestones);
projectRouter.patch('/:projectId/milestones/:milestoneId/status', updateMilestoneStatus);

// Deliverable Submissions & Reviews
projectRouter.post('/:projectId/milestones/:milestoneId/submissions', submitDeliverable);
projectRouter.get('/:projectId/milestones/:milestoneId/submissions', getMilestoneSubmissions);
projectRouter.get('/:projectId/submissions', getMilestoneSubmissions); // alias to fetch all submissions
projectRouter.post('/:projectId/submissions/:submissionId/review', reviewSubmission);

// Project Messaging
projectRouter.get('/:projectId/messages', getProjectMessages);
projectRouter.post('/:projectId/messages', sendProjectMessage);

// Activity Timeline & Workspace Files
projectRouter.get('/:projectId/activity', getProjectActivity);
projectRouter.get('/:projectId/files', getProjectFiles);

// Phase 9: Project Payments, Orders & Financials
projectRouter.post('/:projectId/payments/orders', requireRole('brand'), PaymentController.createPaymentOrder);
projectRouter.get('/:projectId/payments', PaymentController.getProjectPayments);
