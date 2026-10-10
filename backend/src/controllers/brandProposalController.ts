import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { CampaignProposal, IAcceptedAgreementSnapshot } from '../models/CampaignProposal.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { Project } from '../models/Project.js';
import { createNotification } from '../services/notificationService.js';

export const requestRevisionSchema = z.object({
  message: z.string().min(5, 'Revision feedback message must be at least 5 characters').max(1000)
});

function generateProjectReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PRJ-${ts}-${rand}`;
}

// GET /api/brand/proposals
export async function getBrandProposals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brandId = req.user!._id;
    const { briefId, status, q, page = '1', limit = '10' } = req.query;

    const filter: Record<string, any> = {
      brandId,
      status: { $ne: 'draft' } // Drafts are strictly private to creators
    };

    if (status && typeof status === 'string' && status !== 'all') {
      filter.status = status;
    }

    if (briefId && typeof briefId === 'string' && mongoose.Types.ObjectId.isValid(briefId)) {
      filter.briefId = new mongoose.Types.ObjectId(briefId);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [proposals, total] = await Promise.all([
      CampaignProposal.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('creatorId', 'name email avatarUrl')
        .populate('briefId', 'title slug companyName category budgetMin budgetMax currency status')
        .lean(),
      CampaignProposal.countDocuments(filter)
    ]);

    // Populate creator profiles for richer card previews
    const creatorUserIds = proposals.map((p: any) => p.creatorId?._id || p.creatorId);
    const creatorProfiles = await CreatorProfile.find({ userId: { $in: creatorUserIds } })
      .select('userId displayName avatarUrl specialties headline location')
      .lean();

    const profileMap = new Map<string, any>();
    creatorProfiles.forEach((cp: any) => {
      profileMap.set(cp.userId.toString(), cp);
    });

    const enrichedProposals = proposals.map((p: any) => {
      const cId = (p.creatorId?._id || p.creatorId)?.toString();
      const creatorProfile = profileMap.get(cId) || null;
      return {
        ...p,
        id: p._id.toString(),
        brief: p.briefId,
        creator: p.creatorId,
        creatorProfile
      };
    });

    // In-memory search filter if 'q' search term provided
    let results = enrichedProposals;
    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = q.trim().toLowerCase();
      results = results.filter((p: any) => {
        const titleMatch = p.pitchTitle?.toLowerCase().includes(searchTerm);
        const briefTitleMatch = p.brief?.title?.toLowerCase().includes(searchTerm);
        const creatorNameMatch = p.creatorProfile?.displayName?.toLowerCase().includes(searchTerm) ||
                                 p.creator?.name?.toLowerCase().includes(searchTerm);
        return titleMatch || briefTitleMatch || creatorNameMatch;
      });
    }

    res.status(200).json({
      success: true,
      data: results,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/brand/proposals/:proposalId
export async function getBrandProposalById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const brandId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({
      _id: proposalId,
      brandId,
      status: { $ne: 'draft' } // Drafts are strictly private to creators
    })
      .populate('creatorId', 'name email avatarUrl')
      .populate('briefId', 'title slug companyName description requiredSpecialties creativeTools budgetMin budgetMax currency status durationWeeks deadline')
      .lean();

    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    // Load creator profile to display verified public portfolio references and services
    const creatorUserId = (proposal.creatorId as any)._id || proposal.creatorId;
    const profile = await CreatorProfile.findOne({ userId: creatorUserId }).lean();

    let populatedPortfolio: any[] = [];
    let populatedService: any = null;

    if (profile) {
      const referencedIds = new Set(proposal.referencedPortfolioItemIds || []);
      populatedPortfolio = (profile.portfolioItems || []).filter((item: any) => referencedIds.has(item.id));

      if (proposal.referencedServiceId) {
        populatedService = (profile.services || []).find((s: any) => s.id === proposal.referencedServiceId) || null;
      }
    }

    // Explainable compatibility computation based on actual data
    let compatibility: { matchPercentage: number; matchingSpecialties: string[]; budgetFit: boolean; notes: string[] } | null = null;
    const brief = proposal.briefId as any;
    if (profile && brief) {
      const briefSpecialties: string[] = brief.requiredSpecialties || [];
      const creatorSpecialties: string[] = profile.specialties || [];
      const matchingSpecialties = briefSpecialties.filter((s) => creatorSpecialties.includes(s));

      const withinBudget = proposal.proposedPrice >= brief.budgetMin && proposal.proposedPrice <= brief.budgetMax;
      const notes: string[] = [];

      if (matchingSpecialties.length > 0) {
        notes.push(`${matchingSpecialties.length} required specialties directly matched (${matchingSpecialties.join(', ')}).`);
      } else {
        notes.push('No direct specialty overlap recorded on creator profile.');
      }

      if (withinBudget) {
        notes.push(`Proposed price ($${proposal.proposedPrice}) is within stated campaign budget range ($${brief.budgetMin} - $${brief.budgetMax}).`);
      } else if (proposal.proposedPrice < brief.budgetMin) {
        notes.push(`Proposed price ($${proposal.proposedPrice}) is below stated campaign budget minimum.`);
      } else {
        notes.push(`Proposed price ($${proposal.proposedPrice}) exceeds stated campaign budget maximum ($${brief.budgetMax}).`);
      }

      let score = 50;
      if (briefSpecialties.length > 0) {
        score += Math.round((matchingSpecialties.length / briefSpecialties.length) * 35);
      } else {
        score += 25;
      }
      if (withinBudget) score += 15;
      score = Math.min(100, Math.max(20, score));

      compatibility = {
        matchPercentage: score,
        matchingSpecialties,
        budgetFit: withinBudget,
        notes
      };
    }

    res.status(200).json({
      success: true,
      data: {
        ...proposal,
        id: proposal._id.toString(),
        brief: proposal.briefId,
        creator: proposal.creatorId,
        creatorProfile: profile ? {
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          specialties: profile.specialties,
          headline: profile.headline,
          biography: profile.biography,
          location: profile.location
        } : null,
        referencedPortfolio: populatedPortfolio,
        referencedService: populatedService,
        compatibility
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/proposals/:proposalId/shortlist
export async function shortlistProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const brandId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({ _id: proposalId, brandId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    if (proposal.status !== 'submitted') {
      res.status(409).json({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot shortlist a proposal in "${proposal.status}" status. Only submitted proposals can be shortlisted.`
        }
      });
      return;
    }

    proposal.status = 'shortlisted';
    await proposal.save();

    const brief = await CampaignBrief.findById(proposal.briefId).select('title').lean();

    await createNotification({
      recipientId: proposal.creatorId,
      type: 'proposal_shortlisted',
      title: 'Proposal Shortlisted!',
      message: `Your proposal for "${brief?.title || 'campaign'}" has been shortlisted by the brand.`,
      proposalId: proposal._id,
      briefId: proposal.briefId
    });

    res.status(200).json({
      success: true,
      message: 'Proposal shortlisted.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/proposals/:proposalId/request-revision
export async function requestRevision(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const brandId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const parseResult = requestRevisionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Revision feedback message is required.',
          details: parseResult.error.flatten()
        }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({ _id: proposalId, brandId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    if (!['submitted', 'shortlisted'].includes(proposal.status)) {
      res.status(409).json({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot request revisions for a proposal in "${proposal.status}" status.`
        }
      });
      return;
    }

    proposal.status = 'revision_requested';
    proposal.revisionMessage = parseResult.data.message;
    await proposal.save();

    const brief = await CampaignBrief.findById(proposal.briefId).select('title').lean();

    await createNotification({
      recipientId: proposal.creatorId,
      type: 'revision_requested',
      title: 'Revision Requested on Proposal',
      message: `The brand requested revisions on your proposal for "${brief?.title || 'campaign'}": "${parseResult.data.message.substring(0, 100)}..."`,
      proposalId: proposal._id,
      briefId: proposal.briefId
    });

    res.status(200).json({
      success: true,
      message: 'Revision request sent to creator.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/proposals/:proposalId/accept
export async function acceptProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const brandId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    // 1. Find proposal and verify brand ownership
    const proposal = await CampaignProposal.findOne({ _id: proposalId, brandId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    // 2. Verify proposal status is eligible for acceptance
    if (!['submitted', 'shortlisted'].includes(proposal.status)) {
      res.status(409).json({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot accept proposal in "${proposal.status}" status. Only submitted or shortlisted proposals can be accepted.`
        }
      });
      return;
    }

    // 3. Atomically lock CampaignBrief for this award
    // Concurrency guarantee: Only ONE request can succeed because of atomic findOneAndUpdate condition
    const updatedBrief = await CampaignBrief.findOneAndUpdate(
      {
        _id: proposal.briefId,
        brandId,
        status: { $in: ['published', 'paused'] },
        awardedProposalId: { $exists: false }
      },
      {
        $set: {
          status: 'awarded',
          awardedProposalId: proposal._id,
          awardedCreatorId: proposal.creatorId,
          awardedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedBrief) {
      // Either already awarded or brief is not in an eligible state
      const checkBrief = await CampaignBrief.findOne({ _id: proposal.briefId, brandId });
      if (checkBrief?.status === 'awarded' || checkBrief?.awardedProposalId) {
        res.status(409).json({
          error: {
            code: 'CAMPAIGN_ALREADY_AWARDED',
            message: 'This campaign has already been awarded to another proposal. Only one winning proposal is allowed.'
          }
        });
        return;
      }

      res.status(409).json({
        error: {
          code: 'CAMPAIGN_INELIGIBLE',
          message: 'The campaign brief is archived or no longer eligible for project award.'
        }
      });
      return;
    }

    // 4. Record immutable snapshot of agreed terms
    const agreementSnapshot: IAcceptedAgreementSnapshot = {
      agreedPrice: proposal.proposedPrice,
      currency: proposal.currency,
      deliveryDurationWeeks: proposal.deliveryDurationWeeks,
      targetStartDate: proposal.targetStartDate,
      deliverables: [...proposal.deliverables],
      milestones: [...proposal.milestones],
      revisionAllowance: proposal.revisionAllowance,
      pitchTitle: proposal.pitchTitle,
      pitchMessage: proposal.pitchMessage,
      creatorId: proposal.creatorId,
      brandId: proposal.brandId,
      briefId: proposal.briefId,
      acceptedAt: new Date(),
      proposalVersion: proposal.revisionNumber
    };

    // 5. Update winning proposal status
    proposal.status = 'accepted';
    proposal.decisionAt = new Date();
    proposal.acceptedAgreementSnapshot = agreementSnapshot;
    await proposal.save();

    // 6. Create Project record
    const projectReference = generateProjectReference();
    const project = await Project.create({
      projectReference,
      briefId: proposal.briefId,
      proposalId: proposal._id,
      creatorId: proposal.creatorId,
      brandId: proposal.brandId,
      title: updatedBrief.title,
      agreedDescription: proposal.pitchMessage,
      agreedDeliverables: proposal.deliverables,
      agreedPrice: proposal.proposedPrice,
      currency: proposal.currency,
      deliveryDurationWeeks: proposal.deliveryDurationWeeks,
      targetStartDate: proposal.targetStartDate,
      milestones: proposal.milestones,
      revisionAllowance: proposal.revisionAllowance,
      status: 'ready_for_kickoff',
      agreementSnapshot
    });

    // 7. Apply single-winner policy to competing active proposals
    const competingProposals = await CampaignProposal.find({
      briefId: proposal.briefId,
      _id: { $ne: proposal._id },
      status: { $in: ['submitted', 'shortlisted', 'revision_requested'] }
    });

    if (competingProposals.length > 0) {
      await CampaignProposal.updateMany(
        {
          briefId: proposal.briefId,
          _id: { $ne: proposal._id },
          status: { $in: ['submitted', 'shortlisted', 'revision_requested'] }
        },
        {
          $set: {
            status: 'declined',
            decisionAt: new Date()
          }
        }
      );

      // Notify competing creators that campaign was awarded to another proposal
      for (const comp of competingProposals) {
        await createNotification({
          recipientId: comp.creatorId,
          type: 'campaign_awarded_other',
          title: 'Campaign Awarded',
          message: `The campaign "${updatedBrief.title}" has been awarded to another creator. Thank you for your proposal.`,
          proposalId: comp._id,
          briefId: proposal.briefId,
          idempotencyKey: `award_decline_${comp._id}`
        });
      }
    }

    // 8. Notifications for winning creator and brand
    await createNotification({
      recipientId: proposal.creatorId,
      type: 'proposal_accepted',
      title: 'Proposal Accepted! Project Awarded',
      message: `Congratulations! Your proposal for "${updatedBrief.title}" was accepted. A new project workspace has been created.`,
      proposalId: proposal._id,
      briefId: proposal.briefId,
      projectId: project._id,
      idempotencyKey: `accept_prop_${proposal._id}`
    });

    await createNotification({
      recipientId: brandId,
      type: 'project_created',
      title: 'Project Created',
      message: `You accepted a proposal for "${updatedBrief.title}". Project ${project.projectReference} is ready for kickoff.`,
      proposalId: proposal._id,
      briefId: proposal.briefId,
      projectId: project._id,
      idempotencyKey: `project_created_${project._id}`
    });

    res.status(200).json({
      success: true,
      message: 'Proposal accepted and project awarded successfully.',
      data: {
        proposal,
        project,
        brief: updatedBrief
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/proposals/:proposalId/decline
export async function declineProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const brandId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({ _id: proposalId, brandId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    if (!['submitted', 'shortlisted', 'revision_requested'].includes(proposal.status)) {
      res.status(409).json({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot decline a proposal in "${proposal.status}" status.`
        }
      });
      return;
    }

    proposal.status = 'declined';
    proposal.decisionAt = new Date();
    await proposal.save();

    const brief = await CampaignBrief.findById(proposal.briefId).select('title').lean();

    await createNotification({
      recipientId: proposal.creatorId,
      type: 'proposal_declined',
      title: 'Proposal Update',
      message: `Your proposal for "${brief?.title || 'campaign'}" was declined by the brand.`,
      proposalId: proposal._id,
      briefId: proposal.briefId
    });

    res.status(200).json({
      success: true,
      message: 'Proposal declined.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}
