import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CreativeBriefDraft } from '../models/CreativeBriefDraft';
import { CampaignBrief } from '../models/CampaignBrief';
import { BrandProfile } from '../models/BrandProfile';
import { User } from '../models/User';
import { generatedBriefSchema } from '../ai/schemas';

export const listCreativeDrafts = async (req: Request, res: Response): Promise<void> => {
  try {
    const brandId = (req as any).user?.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [drafts, total] = await Promise.all([
      CreativeBriefDraft.find({ brandId: new Types.ObjectId(brandId) })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreativeBriefDraft.countDocuments({ brandId: new Types.ObjectId(brandId) })
    ]);

    res.status(200).json({
      success: true,
      data: drafts.map((d: any) => ({
        ...d,
        id: d._id?.toString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DRAFTS_FETCH_FAILED', message: err.message }
    });
  }
};

export const getCreativeDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const brandId = (req as any).user?.id;
    const draftId = typeof req.params.draftId === 'string' ? req.params.draftId : (req.params.draftId as any)?.[0] || '';

    if (!draftId || !Types.ObjectId.isValid(draftId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid draft ID format' }
      });
      return;
    }

    const draft = await CreativeBriefDraft.findOne({
      _id: new Types.ObjectId(draftId),
      brandId: new Types.ObjectId(brandId)
    });

    if (!draft) {
      res.status(404).json({
        success: false,
        error: { code: 'DRAFT_NOT_FOUND', message: 'Creative draft not found or unauthorized' }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: draft
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DRAFT_FETCH_FAILED', message: err.message }
    });
  }
};

export const createCreativeDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const brandId = (req as any).user?.id;
    const {
      title,
      userPrompt,
      promptContext,
      structuredBrief,
      creativeDirections,
      selectedDirectionIndex,
      moodboardReferences,
      moodboardAnalysis,
      synthesizedRequirements,
      aiMetadata
    } = req.body;

    if (!title || !userPrompt || !structuredBrief) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'title, userPrompt, and structuredBrief are required' }
      });
      return;
    }

    // Validate structuredBrief against schema
    const briefValidation = generatedBriefSchema.safeParse(structuredBrief);
    if (!briefValidation.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_BRIEF_SCHEMA', message: 'structuredBrief does not match expected schema', details: briefValidation.error.errors }
      });
      return;
    }

    const draft = await CreativeBriefDraft.create({
      brandId: new Types.ObjectId(brandId),
      title: title.trim(),
      userPrompt: userPrompt.trim(),
      promptContext,
      structuredBrief: briefValidation.data,
      creativeDirections: Array.isArray(creativeDirections) ? creativeDirections : [],
      selectedDirectionIndex: typeof selectedDirectionIndex === 'number' ? selectedDirectionIndex : 0,
      moodboardReferences: Array.isArray(moodboardReferences) ? moodboardReferences : [],
      moodboardAnalysis,
      synthesizedRequirements,
      improvementsHistory: [],
      version: 1,
      generationStatus: 'ready',
      aiMetadata: aiMetadata
        ? {
            provider: aiMetadata.provider,
            model: aiMetadata.model,
            totalTokens: aiMetadata.totalTokens,
            generatedAt: new Date()
          }
        : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Creative draft saved successfully',
      data: draft
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DRAFT_CREATE_FAILED', message: err.message }
    });
  }
};

export const updateCreativeDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const brandId = (req as any).user?.id;
    const draftId = typeof req.params.draftId === 'string' ? req.params.draftId : (req.params.draftId as any)?.[0] || '';

    if (!draftId || !Types.ObjectId.isValid(draftId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid draft ID format' }
      });
      return;
    }

    const draft = await CreativeBriefDraft.findOne({
      _id: new Types.ObjectId(draftId),
      brandId: new Types.ObjectId(brandId)
    });

    if (!draft) {
      res.status(404).json({
        success: false,
        error: { code: 'DRAFT_NOT_FOUND', message: 'Creative draft not found or unauthorized' }
      });
      return;
    }

    const allowedFields = [
      'title',
      'structuredBrief',
      'creativeDirections',
      'selectedDirectionIndex',
      'moodboardReferences',
      'moodboardAnalysis',
      'synthesizedRequirements',
      'improvementsHistory'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'structuredBrief') {
          const validated = generatedBriefSchema.safeParse(req.body.structuredBrief);
          if (!validated.success) {
            res.status(400).json({
              success: false,
              error: { code: 'INVALID_BRIEF_SCHEMA', message: 'structuredBrief does not match expected schema', details: validated.error.errors }
            });
            return;
          }
          (draft as any)[field] = validated.data;
        } else {
          (draft as any)[field] = req.body[field];
        }
      }
    }

    draft.version = (draft.version || 1) + 1;
    await draft.save();

    res.status(200).json({
      success: true,
      message: 'Creative draft updated successfully',
      data: draft
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DRAFT_UPDATE_FAILED', message: err.message }
    });
  }
};

export const deleteCreativeDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const brandId = (req as any).user?.id;
    const draftId = typeof req.params.draftId === 'string' ? req.params.draftId : (req.params.draftId as any)?.[0] || '';

    if (!draftId || !Types.ObjectId.isValid(draftId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid draft ID format' }
      });
      return;
    }

    const deleted = await CreativeBriefDraft.findOneAndDelete({
      _id: new Types.ObjectId(draftId),
      brandId: new Types.ObjectId(brandId)
    });

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'DRAFT_NOT_FOUND', message: 'Creative draft not found or unauthorized' }
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Creative draft deleted successfully'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'DRAFT_DELETE_FAILED', message: err.message }
    });
  }
};

export const createCampaignBriefFromDraft = async (req: Request, res: Response): Promise<void> => {
  try {
    const brandId = (req as any).user?.id;
    const draftId = typeof req.params.draftId === 'string' ? req.params.draftId : (req.params.draftId as any)?.[0] || '';

    if (!draftId || !Types.ObjectId.isValid(draftId)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid draft ID format' }
      });
      return;
    }

    const draft = await CreativeBriefDraft.findOne({
      _id: new Types.ObjectId(draftId),
      brandId: new Types.ObjectId(brandId)
    });

    if (!draft) {
      res.status(404).json({
        success: false,
        error: { code: 'DRAFT_NOT_FOUND', message: 'Creative draft not found or unauthorized' }
      });
      return;
    }

    // Lookup brand company info
    const [brandProfile, user] = await Promise.all([
      BrandProfile.findOne({ userId: new Types.ObjectId(brandId) }),
      User.findById(new Types.ObjectId(brandId))
    ]);

    const companyName = brandProfile?.companyName || user?.name || 'Kampus Partner';
    const companySlug = brandProfile?.companySlug || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const briefData = draft.structuredBrief;

    // Build unique slug
    const baseSlug = (briefData.title || draft.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // Map deliverables to strings array as expected by CampaignBrief
    const deliverablesList = briefData.deliverables.map(
      (d) => `${d.quantity}x ${d.name} (${d.format}${d.dimensionsOrRatio ? ` - ${d.dimensionsOrRatio}` : ''})`
    );

    // Map budget
    const budgetMin = draft.promptContext?.knownBudgetMin || briefData.budgetSuggestion?.minBudget || 1000;
    const budgetMax = draft.promptContext?.knownBudgetMax || briefData.budgetSuggestion?.maxBudget || 3000;
    const currency = draft.promptContext?.currency || briefData.budgetSuggestion?.currency || 'USD';
    const durationWeeks = draft.promptContext?.timelineWeeks || briefData.timelineSuggestion?.estimatedWeeks || 4;

    // Detailed description synthesis
    let fullDescription = `**Campaign Objective**\n${briefData.objective}\n\n` +
      `**Target Audience**\n${briefData.targetAudience}\n\n` +
      `**Core Message**\n${briefData.coreMessage}\n\n` +
      `**Creative Approach**\n${briefData.creativeApproach}\n\n`;

    if (draft.creativeDirections && draft.creativeDirections.length > 0) {
      const selectedDir = draft.creativeDirections[draft.selectedDirectionIndex || 0];
      if (selectedDir) {
        fullDescription += `**Selected Creative Direction: ${selectedDir.directionName}**\n` +
          `${selectedDir.creativeConcept}\n` +
          `*Visual Style:* ${selectedDir.visualStyle}\n` +
          `*Palette:* ${selectedDir.colorPalette.map(c => `${c.name} (${c.hex})`).join(', ')}\n` +
          `*Lighting & Composition:* ${selectedDir.lightingAndComposition}\n` +
          `*Motion Direction:* ${selectedDir.motionOrCameraDirection}\n\n`;
      }
    }

    if (briefData.acceptanceCriteria && briefData.acceptanceCriteria.length > 0) {
      fullDescription += `**Acceptance Criteria**\n${briefData.acceptanceCriteria.map(c => `- ${c}`).join('\n')}\n\n`;
    }

    if (briefData.constraints && briefData.constraints.length > 0) {
      fullDescription += `**Brand Constraints**\n${briefData.constraints.map(c => `- ${c}`).join('\n')}\n\n`;
    }

    // Extract reference URLs from moodboard
    const referenceUrls = (draft.moodboardReferences || []).map(r => r.url);

    // Create the unpublished draft CampaignBrief
    const campaignBrief = await CampaignBrief.create({
      brandId: new Types.ObjectId(brandId),
      companyName,
      companySlug,
      title: briefData.title || draft.title,
      slug,
      summary: briefData.summary || fullDescription.slice(0, 280),
      description: fullDescription.slice(0, 5000),
      category: draft.promptContext?.category || 'General Creative',
      requiredSpecialties: briefData.requiredSpecialties || ['Digital Creative'],
      creativeTools: briefData.suggestedTools || [],
      deliverables: deliverablesList,
      budgetType: 'range',
      budgetMin,
      budgetMax,
      currency,
      durationWeeks,
      engagementType: 'milestone',
      locationPreference: (draft.promptContext?.locationPreference as any) || 'remote',
      experienceLevel: 'any',
      referenceUrls,
      status: 'draft' // Remains draft until brand explicitly publishes it
    });

    // Link back to draft
    draft.campaignBriefId = campaignBrief._id as Types.ObjectId;
    await draft.save();

    res.status(201).json({
      success: true,
      message: 'Campaign brief draft created successfully from AI creative studio',
      data: {
        campaignBriefId: campaignBrief.id,
        slug: campaignBrief.slug,
        title: campaignBrief.title,
        status: campaignBrief.status
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CONVERSION_FAILED', message: err.message }
    });
  }
};
