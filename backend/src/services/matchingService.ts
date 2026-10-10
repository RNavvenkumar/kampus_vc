import mongoose from 'mongoose';
import { CampaignBrief, ICampaignBrief } from '../models/CampaignBrief.js';
import { CreatorProfile, ICreatorProfile, IPortfolioItem } from '../models/CreatorProfile.js';
import { User } from '../models/User.js';
import { SafePublicCreator } from './creatorSearchService.js';

export interface CitedPortfolioEvidence {
  id: string;
  title: string;
  thumbnailUrl?: string;
  mediaUrl: string;
  mediaType: string;
  category: string;
  matchedTags: string[];
}

export interface MatchBreakdown {
  specialties: {
    score: number;
    maxScore: number;
    matched: string[];
    missing: string[];
    explanation: string;
  };
  tools: {
    score: number;
    maxScore: number;
    matched: string[];
    missing: string[];
    explanation: string;
  };
  portfolioEvidence: {
    score: number;
    maxScore: number;
    citedItems: CitedPortfolioEvidence[];
    matchCount: number;
    explanation: string;
  };
  serviceCompatibility: {
    score: number;
    maxScore: number;
    matchingServiceCount: number;
    explanation: string;
  };
  budget: {
    status: 'compatible' | 'stretch' | 'incompatible' | 'unknown';
    score: number;
    maxScore: number;
    currencyMatch: boolean;
    creatorRate?: number;
    creatorCurrency: string;
    briefBudgetMin: number;
    briefBudgetMax: number;
    briefCurrency: string;
    explanation: string;
  };
  availability: {
    status: 'available' | 'limited' | 'busy' | 'unknown';
    score: number;
    maxScore: number;
    explanation: string;
  };
}

export interface CreatorCampaignMatch {
  creator: SafePublicCreator;
  overallScore: number;
  matchGrade: 'Exceptional Match' | 'Strong Match' | 'Moderate Match' | 'Potential Match';
  breakdown: MatchBreakdown;
  strengths: string[];
  gaps: string[];
}

export interface CampaignMatchesResult {
  brief: {
    id: string;
    title: string;
    category: string;
    requiredSpecialties: string[];
    creativeTools: string[];
    budgetMin: number;
    budgetMax: number;
    currency: string;
    status: string;
    durationWeeks: number;
  };
  totalMatches: number;
  matches: CreatorCampaignMatch[];
}

export class MatchingService {
  /**
   * Evaluate a single creator profile against a campaign brief using explainable, deterministic scoring.
   */
  evaluateCreatorFit(creator: ICreatorProfile, brief: ICampaignBrief): CreatorCampaignMatch {
    const publicPortfolio: IPortfolioItem[] = (creator.portfolioItems || []).filter(
      (item) => item.visibility === 'public'
    );
    const activeServices = (creator.services || []).filter((s) => s.status === 'active');

    const strengths: string[] = [];
    const gaps: string[] = [];

    // ==========================================
    // 1. Specialty & Category Alignment (Max 35)
    // ==========================================
    const requiredSpecs = (brief.requiredSpecialties || []).map((s) => s.trim().toLowerCase());
    const creatorSpecs = (creator.specialties || []).map((s) => s.trim().toLowerCase());
    const creatorCategory = creator.specialties?.[0]?.toLowerCase() || '';
    const briefCategory = brief.category?.toLowerCase() || '';

    let matchedSpecialties: string[] = [];
    let missingSpecialties: string[] = [];
    let specialtyScore = 0;
    const maxSpecialtyScore = 35;

    if (requiredSpecs.length > 0) {
      matchedSpecialties = (brief.requiredSpecialties || []).filter((reqSpec) =>
        creatorSpecs.some((cSpec) => cSpec.includes(reqSpec.toLowerCase()) || reqSpec.toLowerCase().includes(cSpec))
      );
      missingSpecialties = (brief.requiredSpecialties || []).filter(
        (reqSpec) => !matchedSpecialties.includes(reqSpec)
      );

      const ratio = matchedSpecialties.length / requiredSpecs.length;
      specialtyScore = Math.round(ratio * maxSpecialtyScore);

      if (matchedSpecialties.length === requiredSpecs.length) {
        strengths.push(`Matches all ${requiredSpecs.length} required campaign specialties`);
      } else if (matchedSpecialties.length > 0) {
        strengths.push(`Matches ${matchedSpecialties.length} of ${requiredSpecs.length} required specialties (${matchedSpecialties.join(', ')})`);
      }

      if (missingSpecialties.length > 0) {
        gaps.push(`Missing experience in: ${missingSpecialties.join(', ')}`);
      }
    } else {
      // If no granular required specialties specified, check broad category match
      const categoryMatches = briefCategory && creatorSpecs.some((cs) => cs.includes(briefCategory) || briefCategory.includes(cs));
      if (categoryMatches || creatorCategory === briefCategory) {
        specialtyScore = maxSpecialtyScore;
        matchedSpecialties = [brief.category];
        strengths.push(`Core specialty directly matches ${brief.category}`);
      } else {
        specialtyScore = 15;
        gaps.push(`Category difference: Creator specializes in ${creator.specialties?.slice(0, 2).join(', ') || 'general creative'}`);
      }
    }

    const specialtyExplanation =
      matchedSpecialties.length > 0
        ? `Verified alignment in: ${matchedSpecialties.join(', ')}.${missingSpecialties.length > 0 ? ` Unlisted: ${missingSpecialties.join(', ')}.` : ''}`
        : `No direct specialty overlap recorded with ${brief.category}.`;

    // ==========================================
    // 2. Creative Tools & Software (Max 25)
    // ==========================================
    const requiredTools = (brief.creativeTools || []).map((t) => t.trim().toLowerCase());
    const creatorTools = (creator.creativeTools || []).map((t) => t.trim().toLowerCase());
    const maxToolsScore = 25;
    let matchedTools: string[] = [];
    let missingTools: string[] = [];
    let toolsScore = 0;

    if (requiredTools.length > 0) {
      matchedTools = (brief.creativeTools || []).filter((reqTool) =>
        creatorTools.some((cTool) => cTool.includes(reqTool.toLowerCase()) || reqTool.toLowerCase().includes(cTool))
      );
      missingTools = (brief.creativeTools || []).filter((reqTool) => !matchedTools.includes(reqTool));

      const ratio = matchedTools.length / requiredTools.length;
      toolsScore = Math.round(ratio * maxToolsScore);

      if (matchedTools.length > 0) {
        strengths.push(`Proficient in requested tools: ${matchedTools.join(', ')}`);
      }
      if (missingTools.length > 0) {
        gaps.push(`Requested tools not listed in profile: ${missingTools.join(', ')}`);
      }
    } else {
      // Brief did not specify tools: award baseline based on creator tool mastery
      toolsScore = Math.min(maxToolsScore, Math.max(12, (creator.creativeTools?.length || 0) * 4));
      matchedTools = (creator.creativeTools || []).slice(0, 3);
    }

    const toolsExplanation =
      matchedTools.length > 0
        ? `Tool mastery verified for: ${matchedTools.join(', ')}.${missingTools.length > 0 ? ` Not explicitly listed: ${missingTools.join(', ')}.` : ''}`
        : 'Creator has not listed specific tools required for this brief.';

    // ==========================================
    // 3. Public Portfolio Evidence (Max 20)
    // ==========================================
    const maxEvidenceScore = 20;
    const briefKeywords = [
      brief.category?.toLowerCase(),
      ...(brief.requiredSpecialties || []).map((s) => s.toLowerCase()),
      ...(brief.creativeTools || []).map((t) => t.toLowerCase())
    ].filter(Boolean);

    const citedItems: CitedPortfolioEvidence[] = [];

    for (const item of publicPortfolio) {
      const itemTitle = (item.title || '').toLowerCase();
      const itemDesc = (item.description || '').toLowerCase();
      const itemCategory = (item.category || '').toLowerCase();
      const itemTags = (item.tags || []).map((t) => t.toLowerCase());

      const matchedItemTags = (item.tags || []).filter((tag) =>
        briefKeywords.some((bk) => bk.includes(tag.toLowerCase()) || tag.toLowerCase().includes(bk))
      );

      const isKeywordMatch =
        matchedItemTags.length > 0 ||
        briefKeywords.some(
          (bk) => itemTitle.includes(bk) || itemDesc.includes(bk) || itemCategory.includes(bk)
        );

      if (isKeywordMatch) {
        citedItems.push({
          id: (item as any)._id?.toString() || item.id || '',
          title: item.title,
          thumbnailUrl: item.thumbnailUrl || item.mediaUrl,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType || 'image',
          category: item.category || 'General',
          matchedTags: matchedItemTags.length > 0 ? matchedItemTags : [item.category || 'Portfolio']
        });
      }

      if (citedItems.length >= 3) break;
    }

    const portfolioScore = Math.min(maxEvidenceScore, citedItems.length * 10);

    if (citedItems.length > 0) {
      strengths.push(`${citedItems.length} public portfolio project(s) demonstrate relevant visual style`);
    } else if (publicPortfolio.length === 0) {
      gaps.push('No public portfolio projects currently uploaded');
    } else {
      gaps.push('Public portfolio projects do not directly tag keywords for this campaign');
    }

    const portfolioExplanation =
      citedItems.length > 0
        ? `Found ${citedItems.length} matching portfolio project(s) verifying style relevance.`
        : publicPortfolio.length > 0
        ? `Creator has ${publicPortfolio.length} public project(s), but none explicitly match '${brief.category}'.`
        : 'No public portfolio evidence available to inspect.';

    // ==========================================
    // 4. Service Package & Budget Fit (Max 10)
    // ==========================================
    const maxBudgetScore = 10;
    const creatorCurrency = (creator.currency || 'USD').toUpperCase();
    const briefCurrency = (brief.currency || 'USD').toUpperCase();
    let budgetScore = 5;
    let budgetStatus: 'compatible' | 'stretch' | 'incompatible' | 'unknown' = 'unknown';
    let budgetExplanation = '';
    const currencyMatch = creatorCurrency === briefCurrency;

    const matchingServices = activeServices.filter(
      (s) =>
        s.category?.toLowerCase().includes(briefCategory) ||
        briefCategory.includes(s.category?.toLowerCase())
    );

    if (!currencyMatch) {
      budgetStatus = 'unknown';
      budgetScore = 5;
      budgetExplanation = `Currency mismatch (${creatorCurrency} vs ${briefCurrency}). Exact financial comparison requires manual review.`;
      gaps.push(`Currency mismatch (${creatorCurrency} vs ${briefCurrency})`);
    } else if (brief.budgetMin > 0 && brief.budgetMax > 0) {
      const creatorRate = creator.hourlyRate || 0;
      const servicePrices = activeServices.map((s) => s.price).filter((p) => p > 0);
      const minServicePrice = servicePrices.length > 0 ? Math.min(...servicePrices) : 0;

      if (minServicePrice > 0 && minServicePrice <= brief.budgetMax) {
        budgetStatus = 'compatible';
        budgetScore = 10;
        budgetExplanation = `Creator offers starting packages from ${briefCurrency} ${minServicePrice.toLocaleString()} within campaign budget (${briefCurrency} ${brief.budgetMin.toLocaleString()} - ${brief.budgetMax.toLocaleString()}).`;
        strengths.push(`Service packages fit within the ${briefCurrency} ${brief.budgetMax.toLocaleString()} budget`);
      } else if (creatorRate > 0 && creatorRate * 40 <= brief.budgetMax) {
        budgetStatus = 'compatible';
        budgetScore = 9;
        budgetExplanation = `Hourly rate of ${briefCurrency} ${creatorRate}/hr aligns comfortably with the campaign budget.`;
        strengths.push(`Hourly rate (${briefCurrency} ${creatorRate}/hr) matches budget`);
      } else if (minServicePrice > brief.budgetMax) {
        budgetStatus = 'stretch';
        budgetScore = 3;
        budgetExplanation = `Starting package (${briefCurrency} ${minServicePrice.toLocaleString()}) exceeds target maximum (${briefCurrency} ${brief.budgetMax.toLocaleString()}).`;
        gaps.push(`Starting rates may exceed current budget (${briefCurrency} ${minServicePrice.toLocaleString()} vs max ${briefCurrency} ${brief.budgetMax.toLocaleString()})`);
      } else {
        budgetStatus = 'compatible';
        budgetScore = 8;
        budgetExplanation = `Rates fit within standard parameters for ${brief.category}.`;
      }
    } else {
      budgetStatus = 'unknown';
      budgetScore = 7;
      budgetExplanation = 'Campaign does not declare a strict budget constraint; rates appear competitive.';
    }

    // ==========================================
    // 5. Availability & Timeline (Max 10)
    // ==========================================
    const maxAvailScore = 10;
    let availScore = 5;
    let availStatus: 'available' | 'limited' | 'busy' | 'unknown' = 'unknown';
    let availExplanation = '';

    if (creator.availability === 'available') {
      availStatus = 'available';
      availScore = 10;
      availExplanation = 'Creator is marked actively available for new campaign engagements.';
      strengths.push('Available immediately for new work');
    } else if (creator.availability === 'limited') {
      availStatus = 'limited';
      availScore = 6;
      availExplanation = 'Creator has limited bandwidth; timeline should be confirmed during proposal.';
      gaps.push('Limited creator availability / partial bandwidth');
    } else if (creator.availability === 'busy') {
      availStatus = 'busy';
      availScore = 2;
      availExplanation = 'Creator is currently marked busy or fully booked.';
      gaps.push('Creator profile is currently marked busy');
    } else {
      availStatus = 'unknown';
      availScore = 5;
      availExplanation = 'Availability status not explicitly declared on creator profile.';
    }

    // ==========================================
    // Total Overall Score Calculation (0 - 100)
    // ==========================================
    const totalRaw = specialtyScore + toolsScore + portfolioScore + budgetScore + availScore;
    const overallScore = Math.max(0, Math.min(100, totalRaw));

    let matchGrade: 'Exceptional Match' | 'Strong Match' | 'Moderate Match' | 'Potential Match';
    if (overallScore >= 85) {
      matchGrade = 'Exceptional Match';
    } else if (overallScore >= 70) {
      matchGrade = 'Strong Match';
    } else if (overallScore >= 50) {
      matchGrade = 'Moderate Match';
    } else {
      matchGrade = 'Potential Match';
    }

    // Safe Public Creator Projection
    const servicePrices = activeServices.map((s) => s.price).filter((pr) => typeof pr === 'number' && pr > 0);
    const startingPrice = servicePrices.length > 0 ? Math.min(...servicePrices) : creator.hourlyRate;

    const safeCreator: SafePublicCreator = {
      id: creator._id.toString(),
      displayName: creator.displayName || 'Creator',
      username: creator.username || `creator_${creator._id.toString().slice(-6)}`,
      headline: creator.headline || '',
      biography: creator.biography || '',
      avatarUrl: creator.avatarUrl,
      coverUrl: creator.coverUrl,
      specialties: creator.specialties || [],
      creativeTools: creator.creativeTools || [],
      experienceLevel: creator.experienceLevel || 'intermediate',
      location: creator.location,
      website: creator.website,
      socialLinks: creator.socialLinks || {},
      hourlyRate: creator.hourlyRate,
      currency: creator.currency || 'USD',
      availability: creator.availability || 'available',
      availabilityNote: creator.availabilityNote,
      availableFromDate: creator.availableFromDate,
      profileCompletion: creator.profileCompletion || 0,
      portfolioItems: publicPortfolio,
      services: activeServices,
      portfolioCount: publicPortfolio.length,
      servicesCount: activeServices.length,
      startingPrice,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt
    };

    return {
      creator: safeCreator,
      overallScore,
      matchGrade,
      breakdown: {
        specialties: {
          score: specialtyScore,
          maxScore: maxSpecialtyScore,
          matched: matchedSpecialties,
          missing: missingSpecialties,
          explanation: specialtyExplanation
        },
        tools: {
          score: toolsScore,
          maxScore: maxToolsScore,
          matched: matchedTools,
          missing: missingTools,
          explanation: toolsExplanation
        },
        portfolioEvidence: {
          score: portfolioScore,
          maxScore: maxEvidenceScore,
          citedItems,
          matchCount: citedItems.length,
          explanation: portfolioExplanation
        },
        serviceCompatibility: {
          score: matchingServices.length > 0 ? 10 : 5,
          maxScore: 10,
          matchingServiceCount: matchingServices.length,
          explanation:
            matchingServices.length > 0
              ? `Has ${matchingServices.length} active service package(s) in category.`
              : 'No dedicated service packages in this exact category.'
        },
        budget: {
          status: budgetStatus,
          score: budgetScore,
          maxScore: maxBudgetScore,
          currencyMatch,
          creatorRate: creator.hourlyRate,
          creatorCurrency,
          briefBudgetMin: brief.budgetMin,
          briefBudgetMax: brief.budgetMax,
          briefCurrency,
          explanation: budgetExplanation
        },
        availability: {
          status: availStatus,
          score: availScore,
          maxScore: maxAvailScore,
          explanation: availExplanation
        }
      },
      strengths: Array.from(new Set(strengths)),
      gaps: Array.from(new Set(gaps))
    };
  }

  /**
   * Find and rank matching creators for a specific brand-owned campaign brief.
   */
  async matchCreatorsForBrief(
    briefId: string,
    brandUserId: string,
    options: { limit?: number; minScore?: number } = {}
  ): Promise<CampaignMatchesResult> {
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const minScore = options.minScore || 0;

    // 1. Fetch Campaign Brief and verify brand ownership
    const brief = await CampaignBrief.findById(briefId);
    if (!brief) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    if (brief.brandId.toString() !== brandUserId.toString()) {
      throw new Error('UNAUTHORIZED_CAMPAIGN_ACCESS');
    }

    // 2. Fetch all public creator profiles
    const creators = await CreatorProfile.find({
      profileVisibility: 'public'
    }).lean();

    // 3. Exclude the brand's own account if they happen to have a creator profile with same userId
    const validCreators = creators.filter(
      (c) => c.userId && c.userId.toString() !== brandUserId.toString()
    );

    // 4. Verify user accounts are active (not suspended/deleted)
    const userIds = validCreators.map((c) => c.userId).filter(Boolean);
    const activeUsers = await User.find({
      _id: { $in: userIds },
      accountStatus: 'active'
    }).select('_id accountStatus').lean();

    const activeUserSet = new Set(activeUsers.map((u) => u._id.toString()));
    const eligibleCreators = validCreators.filter((c) => c.userId && activeUserSet.has(c.userId.toString()));

    // 5. Run explainable evaluation on each creator
    const matches: CreatorCampaignMatch[] = [];

    for (const creator of eligibleCreators) {
      const match = this.evaluateCreatorFit(creator as unknown as ICreatorProfile, brief);
      if (match.overallScore >= minScore) {
        matches.push(match);
      }
    }

    // 6. Sort by overallScore descending
    matches.sort((a, b) => b.overallScore - a.overallScore);

    const limitedMatches = matches.slice(0, limit);

    return {
      brief: {
        id: brief._id.toString(),
        title: brief.title,
        category: brief.category,
        requiredSpecialties: brief.requiredSpecialties || [],
        creativeTools: brief.creativeTools || [],
        budgetMin: brief.budgetMin,
        budgetMax: brief.budgetMax,
        currency: brief.currency,
        status: brief.status,
        durationWeeks: brief.durationWeeks
      },
      totalMatches: matches.length,
      matches: limitedMatches
    };
  }
}

export const matchingService = new MatchingService();
