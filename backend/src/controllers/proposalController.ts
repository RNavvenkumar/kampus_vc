import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { CampaignProposal } from '../models/CampaignProposal.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { createNotification } from '../services/notificationService.js';

const milestoneItemSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(120),
  description: z.string().max(500).optional().default(''),
  amount: z.number().min(0, 'Milestone amount cannot be negative').optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  order: z.number().int().min(1).default(1)
});

export const createProposalSchema = z.object({
  briefId: z.string().min(1, 'Campaign brief ID is required'),
  pitchTitle: z.string().max(150).optional(),
  pitchMessage: z.string().min(20, 'Pitch message must be at least 20 characters').max(3000, 'Pitch message cannot exceed 3000 characters'),
  referencedPortfolioItemIds: z.array(z.string()).optional().default([]),
  referencedServiceId: z.string().optional().or(z.literal('')),
  proposedPrice: z.number().positive('Proposed price must be greater than zero'),
  currency: z.string().length(3).optional().default('USD'),
  deliveryDurationWeeks: z.number().int().min(1, 'Duration must be at least 1 week').max(52, 'Duration cannot exceed 52 weeks'),
  targetStartDate: z.string().optional().or(z.literal('')),
  deliverables: z.array(z.string().min(1)).min(1, 'At least one deliverable is required'),
  milestones: z.array(milestoneItemSchema).optional().default([]),
  revisionAllowance: z.number().int().min(0).max(10).default(2),
  isDraft: z.boolean().optional().default(false)
});

export const updateProposalSchema = z.object({
  pitchTitle: z.string().max(150).optional(),
  pitchMessage: z.string().min(20, 'Pitch message must be at least 20 characters').max(3000, 'Pitch message cannot exceed 3000 characters').optional(),
  referencedPortfolioItemIds: z.array(z.string()).optional(),
  referencedServiceId: z.string().optional().or(z.literal('')),
  proposedPrice: z.number().positive('Proposed price must be greater than zero').optional(),
  deliveryDurationWeeks: z.number().int().min(1).max(52).optional(),
  targetStartDate: z.string().optional().or(z.literal('')),
  deliverables: z.array(z.string().min(1)).min(1).optional(),
  milestones: z.array(milestoneItemSchema).optional(),
  revisionAllowance: z.number().int().min(0).max(10).optional()
});

function generateProposalReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PROP-${ts}-${rand}`;
}

// Helper to validate creator's ownership of portfolio items & service
async function validateCreatorAssets(
  creatorUserId: mongoose.Types.ObjectId,
  portfolioItemIds: string[],
  serviceId?: string
): Promise<{ valid: boolean; reason?: string }> {
  if (portfolioItemIds.length === 0 && !serviceId) {
    return { valid: true };
  }

  const profile = await CreatorProfile.findOne({ userId: creatorUserId }).lean();
  if (!profile) {
    return { valid: false, reason: 'Creator profile not found. Please complete creator onboarding first.' };
  }

  if (portfolioItemIds.length > 0) {
    const ownedItemIds = new Set((profile.portfolioItems || []).map((p: any) => p.id));
    for (const id of portfolioItemIds) {
      if (!ownedItemIds.has(id)) {
        return { valid: false, reason: `Referenced portfolio item ${id} does not belong to your creator profile.` };
      }
    }
  }

  if (serviceId && serviceId.trim() !== '') {
    const ownedServiceIds = new Set((profile.services || []).map((s: any) => s.id));
    if (!ownedServiceIds.has(serviceId)) {
      return { valid: false, reason: `Referenced service ${serviceId} does not belong to your creator profile.` };
    }
  }

  return { valid: true };
}

// POST /api/creator/proposals
export async function createProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = createProposalSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid proposal data provided.',
          details: parseResult.error.flatten()
        }
      });
      return;
    }

    const creatorId = req.user!._id;
    const data = parseResult.data;

    if (!mongoose.Types.ObjectId.isValid(data.briefId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid campaign brief identifier.' }
      });
      return;
    }

    // Load campaign brief
    const brief = await CampaignBrief.findById(data.briefId);
    if (!brief) {
      res.status(404).json({
        error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief does not exist.' }
      });
      return;
    }

    // Campaign must be active (published) to receive proposals
    if (brief.status !== 'published') {
      res.status(400).json({
        error: {
          code: 'CAMPAIGN_NOT_ELIGIBLE',
          message: `Cannot submit proposals to a campaign with status "${brief.status}". Only active published campaigns accept proposals.`
        }
      });
      return;
    }

    // Currency verification: proposal currency must match campaign currency
    const normalizedCurrency = (data.currency || brief.currency).toUpperCase();
    if (normalizedCurrency !== brief.currency.toUpperCase()) {
      res.status(400).json({
        error: {
          code: 'CURRENCY_MISMATCH',
          message: `Proposed currency (${normalizedCurrency}) must match campaign currency (${brief.currency.toUpperCase()}).`
        }
      });
      return;
    }

    // Milestones total verification if milestone amounts provided
    if (data.milestones && data.milestones.length > 0) {
      const milestonesWithAmount = data.milestones.filter((m) => m.amount !== undefined && m.amount !== null);
      if (milestonesWithAmount.length > 0) {
        const sumAmounts = data.milestones.reduce((acc, m) => acc + (m.amount || 0), 0);
        if (Math.abs(sumAmounts - data.proposedPrice) > 0.05) {
          res.status(400).json({
            error: {
              code: 'MILESTONE_SUM_MISMATCH',
              message: `The sum of milestone amounts (${sumAmounts.toFixed(2)}) must equal the proposed total price (${data.proposedPrice.toFixed(2)}).`
            }
          });
          return;
        }
      }
    }

    // Asset ownership verification
    const assetCheck = await validateCreatorAssets(
      creatorId,
      data.referencedPortfolioItemIds,
      data.referencedServiceId
    );
    if (!assetCheck.valid) {
      res.status(403).json({
        error: {
          code: 'INVALID_ASSET_REFERENCE',
          message: assetCheck.reason || 'Referenced portfolio item or service is invalid.'
        }
      });
      return;
    }

    // Check for existing proposal for this brief by this creator
    const existing = await CampaignProposal.findOne({ creatorId, briefId: brief._id });
    if (existing) {
      // If already submitted or shortlisted, duplicate active proposal is not allowed
      if (['submitted', 'shortlisted'].includes(existing.status)) {
        res.status(409).json({
          error: {
            code: 'DUPLICATE_PROPOSAL',
            message: 'You already have an active submitted proposal for this campaign brief.'
          }
        });
        return;
      }

      // If draft or revision_requested or withdrawn or declined, update and reuse
      existing.pitchTitle = data.pitchTitle;
      existing.pitchMessage = data.pitchMessage;
      existing.referencedPortfolioItemIds = data.referencedPortfolioItemIds;
      existing.referencedServiceId = data.referencedServiceId ? data.referencedServiceId : undefined;
      existing.proposedPrice = data.proposedPrice;
      existing.currency = normalizedCurrency;
      existing.deliveryDurationWeeks = data.deliveryDurationWeeks;
      existing.targetStartDate = data.targetStartDate ? new Date(data.targetStartDate) : undefined;
      existing.deliverables = data.deliverables;
      existing.milestones = data.milestones;
      existing.revisionAllowance = data.revisionAllowance;

      const nextStatus = data.isDraft ? 'draft' : 'submitted';
      if (nextStatus === 'submitted') {
        if (existing.status === 'revision_requested') {
          existing.revisionNumber += 1;
        }
        existing.status = 'submitted';
        existing.submittedAt = new Date();
      } else {
        existing.status = 'draft';
      }

      await existing.save();

      if (existing.status === 'submitted') {
        await createNotification({
          recipientId: brief.brandId,
          type: existing.revisionNumber > 1 ? 'proposal_resubmitted' : 'proposal_submitted',
          title: existing.revisionNumber > 1 ? 'Proposal Resubmitted' : 'New Creator Proposal',
          message: `${req.user!.name || 'A creator'} submitted a proposal for "${brief.title}".`,
          proposalId: existing._id,
          briefId: brief._id
        });
      }

      res.status(200).json({
        success: true,
        message: existing.status === 'draft' ? 'Proposal draft updated.' : 'Proposal submitted successfully.',
        data: existing
      });
      return;
    }

    // Create new proposal
    const status = data.isDraft ? 'draft' : 'submitted';
    const proposal = await CampaignProposal.create({
      creatorId,
      briefId: brief._id,
      brandId: brief.brandId,
      proposalReference: generateProposalReference(),
      pitchTitle: data.pitchTitle,
      pitchMessage: data.pitchMessage,
      referencedPortfolioItemIds: data.referencedPortfolioItemIds,
      referencedServiceId: data.referencedServiceId ? data.referencedServiceId : undefined,
      proposedPrice: data.proposedPrice,
      currency: normalizedCurrency,
      deliveryDurationWeeks: data.deliveryDurationWeeks,
      targetStartDate: data.targetStartDate ? new Date(data.targetStartDate) : undefined,
      deliverables: data.deliverables,
      milestones: data.milestones,
      revisionAllowance: data.revisionAllowance,
      status,
      submittedAt: status === 'submitted' ? new Date() : undefined,
      revisionNumber: 1
    });

    if (status === 'submitted') {
      await createNotification({
        recipientId: brief.brandId,
        type: 'proposal_submitted',
        title: 'New Creator Proposal',
        message: `${req.user!.name || 'A creator'} submitted a proposal for "${brief.title}".`,
        proposalId: proposal._id,
        briefId: brief._id
      });
    }

    res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Proposal draft saved.' : 'Proposal submitted successfully.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creator/proposals
export async function getMyProposals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorId = req.user!._id;
    const { status, briefId, page = '1', limit = '10' } = req.query;

    const filter: Record<string, any> = { creatorId };
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
        .populate('briefId', 'title slug companyName category budgetMin budgetMax currency status')
        .lean(),
      CampaignProposal.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: proposals.map((p: any) => ({
        ...p,
        id: p._id.toString(),
        brief: p.briefId
      })),
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

// GET /api/creator/proposals/:proposalId
export async function getProposalById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const creatorId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({
      _id: proposalId,
      creatorId
    })
      .populate('briefId', 'title slug companyName description requiredSpecialties budgetMin budgetMax currency status deadline durationWeeks')
      .lean();

    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    // Populate creator's referenced portfolio items and service from CreatorProfile
    const profile = await CreatorProfile.findOne({ userId: creatorId }).lean();
    let populatedPortfolio: any[] = [];
    let populatedService: any = null;

    if (profile) {
      const referencedIds = new Set(proposal.referencedPortfolioItemIds || []);
      populatedPortfolio = (profile.portfolioItems || []).filter((item: any) => referencedIds.has(item.id));

      if (proposal.referencedServiceId) {
        populatedService = (profile.services || []).find((s: any) => s.id === proposal.referencedServiceId) || null;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...proposal,
        id: proposal._id.toString(),
        brief: proposal.briefId,
        referencedPortfolio: populatedPortfolio,
        referencedService: populatedService
      }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/creator/proposals/:proposalId
export async function updateProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const creatorId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const parseResult = updateProposalSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid proposal update data.',
          details: parseResult.error.flatten()
        }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({ _id: proposalId, creatorId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    // Only editable in draft, revision_requested, or withdrawn states
    if (!['draft', 'revision_requested', 'withdrawn'].includes(proposal.status)) {
      res.status(409).json({
        error: {
          code: 'PROPOSAL_LOCKED',
          message: `Cannot edit a proposal in "${proposal.status}" status. Only draft, revision-requested, or withdrawn proposals can be edited.`
        }
      });
      return;
    }

    const data = parseResult.data;

    if (data.referencedPortfolioItemIds || data.referencedServiceId) {
      const assetCheck = await validateCreatorAssets(
        creatorId,
        data.referencedPortfolioItemIds || proposal.referencedPortfolioItemIds,
        data.referencedServiceId !== undefined ? data.referencedServiceId : proposal.referencedServiceId
      );
      if (!assetCheck.valid) {
        res.status(403).json({
          error: {
            code: 'INVALID_ASSET_REFERENCE',
            message: assetCheck.reason || 'Referenced portfolio item or service is invalid.'
          }
        });
        return;
      }
    }

    // Validate milestone sums if updated
    const finalPrice = data.proposedPrice ?? proposal.proposedPrice;
    const finalMilestones = data.milestones ?? proposal.milestones;
    if (finalMilestones && finalMilestones.length > 0) {
      const milestonesWithAmount = finalMilestones.filter((m) => m.amount !== undefined && m.amount !== null);
      if (milestonesWithAmount.length > 0) {
        const sumAmounts = finalMilestones.reduce((acc, m) => acc + (m.amount || 0), 0);
        if (Math.abs(sumAmounts - finalPrice) > 0.05) {
          res.status(400).json({
            error: {
              code: 'MILESTONE_SUM_MISMATCH',
              message: `The sum of milestone amounts (${sumAmounts.toFixed(2)}) must equal the proposed total price (${finalPrice.toFixed(2)}).`
            }
          });
          return;
        }
      }
    }

    // Apply whitelist updates
    if (data.pitchTitle !== undefined) proposal.pitchTitle = data.pitchTitle;
    if (data.pitchMessage !== undefined) proposal.pitchMessage = data.pitchMessage;
    if (data.referencedPortfolioItemIds !== undefined) {
      proposal.referencedPortfolioItemIds = data.referencedPortfolioItemIds;
    }
    if (data.referencedServiceId !== undefined) {
      proposal.referencedServiceId = data.referencedServiceId ? data.referencedServiceId : undefined;
    }
    if (data.proposedPrice !== undefined) proposal.proposedPrice = data.proposedPrice;
    if (data.deliveryDurationWeeks !== undefined) proposal.deliveryDurationWeeks = data.deliveryDurationWeeks;
    if (data.targetStartDate !== undefined) {
      proposal.targetStartDate = data.targetStartDate ? new Date(data.targetStartDate) : undefined;
    }
    if (data.deliverables !== undefined) proposal.deliverables = data.deliverables;
    if (data.milestones !== undefined) proposal.milestones = data.milestones;
    if (data.revisionAllowance !== undefined) proposal.revisionAllowance = data.revisionAllowance;

    await proposal.save();

    res.status(200).json({
      success: true,
      message: 'Proposal updated successfully.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/creator/proposals/:proposalId/submit
export async function submitProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const creatorId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({ _id: proposalId, creatorId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    if (!['draft', 'revision_requested', 'withdrawn'].includes(proposal.status)) {
      res.status(409).json({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot submit proposal in "${proposal.status}" status.`
        }
      });
      return;
    }

    // Verify campaign brief is published
    const brief = await CampaignBrief.findById(proposal.briefId);
    if (!brief || brief.status !== 'published') {
      res.status(400).json({
        error: {
          code: 'CAMPAIGN_NOT_ELIGIBLE',
          message: 'The campaign brief is no longer active or accepting proposals.'
        }
      });
      return;
    }

    const wasRevision = proposal.status === 'revision_requested';
    if (wasRevision) {
      proposal.revisionNumber += 1;
    }

    proposal.status = 'submitted';
    proposal.submittedAt = new Date();
    await proposal.save();

    // Notify brand
    await createNotification({
      recipientId: brief.brandId,
      type: wasRevision ? 'proposal_resubmitted' : 'proposal_submitted',
      title: wasRevision ? 'Proposal Resubmitted' : 'Proposal Submitted',
      message: `${req.user!.name || 'A creator'} submitted a proposal for "${brief.title}".`,
      proposalId: proposal._id,
      briefId: brief._id
    });

    res.status(200).json({
      success: true,
      message: wasRevision ? 'Proposal resubmitted with requested revisions.' : 'Proposal submitted successfully.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/creator/proposals/:proposalId/withdraw
export async function withdrawProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawProposalId = req.params.proposalId;
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId;
    const creatorId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid proposal identifier.' }
      });
      return;
    }

    const proposal = await CampaignProposal.findOne({ _id: proposalId, creatorId });
    if (!proposal) {
      res.status(404).json({
        error: { code: 'PROPOSAL_NOT_FOUND', message: 'Proposal not found or access denied.' }
      });
      return;
    }

    if (proposal.status === 'accepted') {
      res.status(409).json({
        error: {
          code: 'CANNOT_WITHDRAW_ACCEPTED',
          message: 'An accepted proposal cannot be withdrawn through ordinary withdrawal.'
        }
      });
      return;
    }

    if (['declined', 'withdrawn'].includes(proposal.status)) {
      res.status(409).json({
        error: {
          code: 'ALREADY_CLOSED',
          message: `Proposal is already in "${proposal.status}" status.`
        }
      });
      return;
    }

    proposal.status = 'withdrawn';
    await proposal.save();

    res.status(200).json({
      success: true,
      message: 'Proposal withdrawn successfully.',
      data: proposal
    });
  } catch (err) {
    next(err);
  }
}
