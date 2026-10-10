import { Router } from 'express';
import { healthRouter } from './healthRoutes.js';
import { authRouter } from './authRoutes.js';
import { creatorProfileRouter } from './creatorProfileRoutes.js';
import { brandProfileRouter } from './brandProfileRoutes.js';
import { brandBriefRouter } from './brandBriefRoutes.js';
import { publicBriefsRouter, publicCreatorsRouter } from './publicDiscoveryRoutes.js';
import { proposalRouter } from './proposalRoutes.js';
import { brandProposalRouter } from './brandProposalRoutes.js';
import { projectRouter } from './projectRoutes.js';
import { notificationRouter } from './notificationRoutes.js';
import { conversationRouter } from './conversationRoutes.js';
import { brandAiRoutes } from './brandAiRoutes.js';
import { creativeDraftRoutes } from './creativeDraftRoutes.js';
import mediaRouter from './mediaRoutes.js';
import { paymentRouter } from './paymentRoutes.js';

export const apiRouter = Router();

// Mount Health checks
apiRouter.use(healthRouter);

// Mount Authentication routes
apiRouter.use('/auth', authRouter);

// Mount Creator Studio routes (Profile, Portfolio, Services, Availability)
apiRouter.use('/creator', creatorProfileRouter);

// Mount Creator Proposal routes
apiRouter.use('/creator/proposals', proposalRouter);

// Mount Brand Profile routes
apiRouter.use('/brand', brandProfileRouter);

// Mount Brand Campaign Briefs
apiRouter.use('/brand/briefs', brandBriefRouter);

// Mount Brand Proposals Review Center
apiRouter.use('/brand/proposals', brandProposalRouter);

// Mount Brand AI Creative Studio & Assistant
apiRouter.use('/brand/ai', brandAiRoutes);

// Mount Brand Persistent Creative Drafts
apiRouter.use('/brand/creative-drafts', creativeDraftRoutes);

// Mount Awarded Projects
apiRouter.use('/projects', projectRouter);

// Mount In-App Notifications
apiRouter.use('/notifications', notificationRouter);

// Mount Direct Messaging & Inquiries
apiRouter.use('/conversations', conversationRouter);

// Mount Secure Media Object Storage & Uploads (Phase 7)
apiRouter.use('/media', mediaRouter);

// Mount Payments, Webhooks, Verification & Refunds (Phase 9)
apiRouter.use('/payments', paymentRouter);

// Mount Public Discovery
apiRouter.use('/briefs', publicBriefsRouter);
apiRouter.use('/creators', publicCreatorsRouter);

// Future Phase Routes (e.g. /messages, /payments)
apiRouter.all('/v1/*', (_req, res) => {
  res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'This endpoint is scheduled for implementation in a future development phase.'
    }
  });
});
