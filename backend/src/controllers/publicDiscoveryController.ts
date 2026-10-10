import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { BrandProfile } from '../models/BrandProfile.js';
import { Review } from '../models/Review.js';

// GET /api/briefs
export async function getPublicBriefs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      q,
      category,
      specialty,
      engagementType,
      locationPreference,
      minBudget,
      maxBudget,
      sort = 'newest',
      page = '1',
      limit = '12'
    } = req.query;

    const filter: Record<string, any> = {
      status: 'published'
    };

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const sanitized = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { summary: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } }
      ];
    }

    if (category && typeof category === 'string' && category !== 'All') {
      filter.category = category;
    }

    if (specialty && typeof specialty === 'string' && specialty !== 'All') {
      filter.requiredSpecialties = specialty;
    }

    if (engagementType && typeof engagementType === 'string' && engagementType !== 'All') {
      filter.engagementType = engagementType;
    }

    if (locationPreference && typeof locationPreference === 'string' && locationPreference !== 'All') {
      filter.locationPreference = locationPreference;
    }

    if (minBudget && !isNaN(Number(minBudget))) {
      filter.budgetMax = { $gte: Number(minBudget) };
    }

    if (maxBudget && !isNaN(Number(maxBudget))) {
      filter.budgetMin = { $lte: Number(maxBudget) };
    }

    let sortOption: Record<string, any> = { publishedAt: -1, createdAt: -1 };
    if (sort === 'budget_high') {
      sortOption = { budgetMax: -1 };
    } else if (sort === 'budget_low') {
      sortOption = { budgetMin: 1 };
    } else if (sort === 'oldest') {
      sortOption = { publishedAt: 1 };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(30, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [briefs, total] = await Promise.all([
      CampaignBrief.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-__v')
        .lean(),
      CampaignBrief.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        briefs: briefs.map((b) => ({
          ...b,
          id: b._id.toString()
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/briefs/:briefIdOrSlug
export async function getPublicBriefByIdOrSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const briefIdOrSlug = Array.isArray(req.params.briefIdOrSlug) ? req.params.briefIdOrSlug[0] : req.params.briefIdOrSlug;

    let query: Record<string, any> = { status: 'published' };
    if (mongoose.Types.ObjectId.isValid(briefIdOrSlug)) {
      query._id = briefIdOrSlug;
    } else {
      query.slug = briefIdOrSlug.toLowerCase();
    }

    const brief = await CampaignBrief.findOne(query).lean();
    if (!brief) {
      res.status(404).json({
        error: {
          code: 'BRIEF_NOT_FOUND',
          message: 'Campaign brief not found or is no longer publicly accessible.'
        }
      });
      return;
    }

    // Lookup public brand profile for context
    const brandProfile = await BrandProfile.findOne({ userId: brief.brandId })
      .select('companyName industry companySize website logoUrl verificationStatus')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...brief,
        id: brief._id.toString(),
        brand: brandProfile || {
          companyName: brief.companyName,
          verificationStatus: 'unverified'
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creators
export async function getPublicCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      q,
      specialty,
      tool,
      availability,
      sort = 'completion',
      page = '1',
      limit = '12'
    } = req.query;

    const filter: Record<string, any> = {
      profileVisibility: 'public'
    };

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const sanitized = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { displayName: { $regex: sanitized, $options: 'i' } },
        { headline: { $regex: sanitized, $options: 'i' } },
        { biography: { $regex: sanitized, $options: 'i' } },
        { specialties: { $regex: sanitized, $options: 'i' } }
      ];
    }

    if (specialty && typeof specialty === 'string' && specialty !== 'All') {
      filter.specialties = specialty;
    }

    if (tool && typeof tool === 'string' && tool !== 'All') {
      filter.creativeTools = tool;
    }

    if (availability && typeof availability === 'string' && availability !== 'All') {
      filter.availability = availability;
    }

    let sortOption: Record<string, any> = { profileCompletion: -1, createdAt: -1 };
    if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'rate_low') {
      sortOption = { hourlyRate: 1 };
    } else if (sort === 'rate_high') {
      sortOption = { hourlyRate: -1 };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(30, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      CreatorProfile.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-userId -__v')
        .lean(),
      CreatorProfile.countDocuments(filter)
    ]);

    // Sanitize and filter embedded private portfolio items and inactive services
    const sanitizedProfiles = profiles.map((p) => {
      const publicPortfolio = (p.portfolioItems || [])
        .filter((item) => item.visibility === 'public')
        .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || a.displayOrder - b.displayOrder);

      const activeServices = (p.services || []).filter((s) => s.status === 'active');

      return {
        ...p,
        id: p._id.toString(),
        portfolioItems: publicPortfolio,
        services: activeServices,
        portfolioCount: publicPortfolio.length,
        servicesCount: activeServices.length
      };
    });

    res.status(200).json({
      success: true,
      data: {
        creators: sanitizedProfiles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creators/:usernameOrId
export async function getPublicCreatorByUsernameOrId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const usernameOrId = Array.isArray(req.params.usernameOrId) ? req.params.usernameOrId[0] : req.params.usernameOrId;

    let query: Record<string, any> = {
      profileVisibility: { $ne: 'private' }
    };

    if (mongoose.Types.ObjectId.isValid(usernameOrId)) {
      query.$or = [{ _id: usernameOrId }, { userId: usernameOrId }];
    } else {
      query.username = usernameOrId.toLowerCase();
    }

    const profile = await CreatorProfile.findOne(query).select('-__v').lean();
    if (!profile) {
      res.status(404).json({
        error: {
          code: 'CREATOR_NOT_FOUND',
          message: 'Creator profile not found or is set to private.'
        }
      });
      return;
    }

    // Filter only public portfolio items
    const publicPortfolio = (profile.portfolioItems || [])
      .filter((item) => item.visibility === 'public')
      .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || a.displayOrder - b.displayOrder);

    // Filter only active services
    const activeServices = (profile.services || []).filter((s) => s.status === 'active');

    // Fetch top 5 recent reviews & average rating
    const targetUserId = profile.userId;
    const recentReviews = await Review.find({ creatorId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const allReviews = await Review.find({ creatorId: targetUserId }).select('rating').lean();
    const count = allReviews.length;
    const avg = count > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
      : (profile.averageRating || 5.0);

    const sanitized = {
      ...profile,
      id: profile._id.toString(),
      userId: undefined, // Never expose raw user ID in public response
      portfolioItems: publicPortfolio,
      services: activeServices,
      averageRating: avg,
      reviewCount: count,
      reviews: recentReviews.map((r: any) => ({
        id: r._id.toString(),
        projectId: r.projectId?.toString(),
        rating: r.rating,
        review: r.review,
        projectTitle: r.projectTitle,
        brandName: r.brandName,
        brandAvatar: r.brandAvatar,
        createdAt: r.createdAt
      }))
    };

    res.status(200).json({
      success: true,
      data: sanitized
    });
  } catch (err) {
    next(err);
  }
}
