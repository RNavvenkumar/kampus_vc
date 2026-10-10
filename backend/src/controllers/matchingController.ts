import { Request, Response, NextFunction } from 'express';
import { matchingService } from '../services/matchingService.js';
import { opportunityService } from '../services/opportunityService.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CreatorProfile } from '../models/CreatorProfile.js';

/**
 * GET /api/brand/briefs/:briefId/matches
 * Explainable matching engine finding top creator candidates for a brand-owned brief.
 */
export async function getCampaignMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const briefId = Array.isArray(req.params.briefId) ? req.params.briefId[0] : req.params.briefId;
    const user = req.user!;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const minScore = req.query.minScore ? Number(req.query.minScore) : 0;

    const result = await matchingService.matchCreatorsForBrief(briefId, user._id.toString(), {
      limit,
      minScore
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    if (err.message === 'CAMPAIGN_NOT_FOUND') {
      res.status(404).json({
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign brief not found.'
        }
      });
      return;
    }
    if (err.message === 'UNAUTHORIZED_CAMPAIGN_ACCESS') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only view creator matches for campaign briefs owned by your brand account.'
        }
      });
      return;
    }
    next(err);
  }
}

/**
 * GET /api/creator/opportunities
 * Personalized campaign opportunities for an authenticated creator.
 */
export async function getCreatorOpportunities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { category, minBudget, maxBudget, sort, limit } = req.query;

    const result = await opportunityService.getOpportunitiesForCreator(user._id.toString(), {
      category: category as string,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      sort: sort as string,
      limit: limit ? Number(limit) : 20
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    if (err.message === 'CREATOR_PROFILE_NOT_FOUND') {
      res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Creator profile not found. Please complete onboarding first.'
        }
      });
      return;
    }
    next(err);
  }
}

/**
 * GET /api/creator/opportunities/:briefId/compatibility
 * Get specific explainable compatibility breakdown between the authenticated creator and a single brief.
 */
export async function getCreatorCampaignCompatibility(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const briefId = Array.isArray(req.params.briefId) ? req.params.briefId[0] : req.params.briefId;
    const user = req.user!;

    const [profile, brief] = await Promise.all([
      CreatorProfile.findOne({ userId: user._id }),
      CampaignBrief.findById(briefId)
    ]);

    if (!profile) {
      res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Creator profile not found.'
        }
      });
      return;
    }

    if (!brief) {
      res.status(404).json({
        error: {
          code: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign brief not found.'
        }
      });
      return;
    }

    const evaluation = matchingService.evaluateCreatorFit(profile, brief);

    res.status(200).json({
      success: true,
      data: {
        brief: {
          id: brief._id.toString(),
          title: brief.title,
          category: brief.category,
          budgetMin: brief.budgetMin,
          budgetMax: brief.budgetMax,
          currency: brief.currency,
          durationWeeks: brief.durationWeeks
        },
        evaluation
      }
    });
  } catch (err) {
    next(err);
  }
}
