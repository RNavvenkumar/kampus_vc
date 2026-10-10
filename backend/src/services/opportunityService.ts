import { CampaignBrief, ICampaignBrief } from '../models/CampaignBrief.js';
import { CreatorProfile, ICreatorProfile } from '../models/CreatorProfile.js';
import { CampaignProposal } from '../models/CampaignProposal.js';
import { matchingService } from './matchingService.js';

export interface CreatorOpportunityItem {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companySlug?: string;
  category: string;
  summary: string;
  description: string;
  requiredSpecialties: string[];
  creativeTools: string[];
  deliverables: string[];
  budgetType: 'fixed' | 'range';
  budgetMin: number;
  budgetMax: number;
  currency: string;
  durationWeeks: number;
  locationPreference: string;
  publishedAt: Date;
  matchScore: number;
  matchGrade: string;
  matchedSpecialties: string[];
  matchedTools: string[];
  reasons: string[];
  proposalStatus?: 'draft' | 'submitted' | 'shortlisted' | 'revision_requested' | 'accepted' | 'declined' | 'withdrawn' | 'none';
  proposalId?: string;
}

export interface CreatorOpportunitiesResult {
  opportunities: CreatorOpportunityItem[];
  total: number;
  creatorSummary: {
    displayName: string;
    specialties: string[];
    creativeTools: string[];
  };
}

export class OpportunityService {
  /**
   * Discover and rank published campaign opportunities tailored to a creator's profile.
   */
  async getOpportunitiesForCreator(
    creatorUserId: string,
    filters: { category?: string; minBudget?: number; maxBudget?: number; sort?: string; limit?: number } = {}
  ): Promise<CreatorOpportunitiesResult> {
    // 1. Fetch Creator Profile
    const profile = await CreatorProfile.findOne({ userId: creatorUserId }).lean();
    if (!profile) {
      throw new Error('CREATOR_PROFILE_NOT_FOUND');
    }

    // 2. Query published campaigns
    const briefQuery: Record<string, any> = {
      status: 'published'
    };

    if (filters.category && filters.category !== 'All') {
      briefQuery.category = filters.category;
    }

    if (filters.minBudget && !isNaN(Number(filters.minBudget))) {
      briefQuery.budgetMax = { $gte: Number(filters.minBudget) };
    }

    if (filters.maxBudget && !isNaN(Number(filters.maxBudget))) {
      briefQuery.budgetMin = { $lte: Number(filters.maxBudget) };
    }

    const briefs = await CampaignBrief.find(briefQuery)
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    // 3. Fetch existing proposals from this creator to annotate opportunities
    const briefIds = briefs.map((b) => b._id);
    const existingProposals = await CampaignProposal.find({
      creatorId: creatorUserId,
      briefId: { $in: briefIds }
    }).select('_id briefId status').lean();

    const proposalMap = new Map<string, { id: string; status: string }>();
    for (const prop of existingProposals) {
      proposalMap.set(prop.briefId.toString(), {
        id: prop._id.toString(),
        status: prop.status
      });
    }

    // 4. Score and explain fit for each opportunity
    const scoredOpportunities: CreatorOpportunityItem[] = [];

    for (const brief of briefs) {
      const evalResult = matchingService.evaluateCreatorFit(
        profile as unknown as ICreatorProfile,
        brief as unknown as ICampaignBrief
      );

      const propData = proposalMap.get(brief._id.toString());

      scoredOpportunities.push({
        id: brief._id.toString(),
        title: brief.title,
        slug: brief.slug,
        companyName: brief.companyName,
        companySlug: brief.companySlug,
        category: brief.category,
        summary: brief.summary || '',
        description: brief.description || '',
        requiredSpecialties: brief.requiredSpecialties || [],
        creativeTools: brief.creativeTools || [],
        deliverables: brief.deliverables || [],
        budgetType: brief.budgetType || 'range',
        budgetMin: brief.budgetMin,
        budgetMax: brief.budgetMax,
        currency: brief.currency,
        durationWeeks: brief.durationWeeks,
        locationPreference: brief.locationPreference || 'remote',
        publishedAt: brief.publishedAt || brief.createdAt,
        matchScore: evalResult.overallScore,
        matchGrade: evalResult.matchGrade,
        matchedSpecialties: evalResult.breakdown.specialties.matched,
        matchedTools: evalResult.breakdown.tools.matched,
        reasons: evalResult.strengths.slice(0, 3),
        proposalStatus: (propData?.status as any) || 'none',
        proposalId: propData?.id
      });
    }

    // 5. Sort opportunities: default to highest match score first, then newest
    if (filters.sort === 'newest') {
      scoredOpportunities.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } else if (filters.sort === 'budget_high') {
      scoredOpportunities.sort((a, b) => b.budgetMax - a.budgetMax);
    } else {
      // Default: match relevance
      scoredOpportunities.sort((a, b) => b.matchScore - a.matchScore);
    }

    const limitNum = filters.limit ? Math.min(50, Math.max(1, filters.limit)) : 20;
    const limited = scoredOpportunities.slice(0, limitNum);

    return {
      opportunities: limited,
      total: scoredOpportunities.length,
      creatorSummary: {
        displayName: profile.displayName || 'Creator',
        specialties: profile.specialties || [],
        creativeTools: profile.creativeTools || []
      }
    };
  }
}

export const opportunityService = new OpportunityService();
