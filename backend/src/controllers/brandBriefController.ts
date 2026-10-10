import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CampaignBrief, ICampaignBrief } from '../models/CampaignBrief.js';
import { BrandProfile } from '../models/BrandProfile.js';
import { IUser } from '../models/User.js';

export const createBriefSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters'),
  summary: z.string().max(300, 'Summary cannot exceed 300 characters').optional().default(''),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional().default(''),
  category: z.string().min(1, 'Category is required').default('General Creative'),
  requiredSpecialties: z.array(z.string()).optional().default([]),
  creativeTools: z.array(z.string()).optional().default([]),
  deliverables: z.array(z.string()).optional().default([]),
  budgetType: z.enum(['fixed', 'range']).default('range'),
  budgetMin: z.number().min(0, 'Minimum budget cannot be negative').default(1000),
  budgetMax: z.number().min(0, 'Maximum budget cannot be negative').default(3000),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('USD'),
  durationWeeks: z.number().int().min(1).max(52).default(4),
  targetStartDate: z.string().optional().or(z.literal('')),
  deadline: z.string().optional().or(z.literal('')),
  engagementType: z.enum(['milestone', 'retainer', 'one_off']).default('milestone'),
  locationPreference: z.enum(['remote', 'hybrid', 'onsite']).default('remote'),
  experienceLevel: z.enum(['any', 'intermediate', 'advanced', 'expert']).default('any'),
  referenceUrls: z.array(z.string().url('Reference URL must be valid')).optional().default([])
}).refine((data) => data.budgetMin <= data.budgetMax, {
  message: 'Minimum budget cannot exceed maximum budget',
  path: ['budgetMin']
});

export const updateBriefSchema = z.object({
  title: z.string().min(3).max(150).optional(),
  summary: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().min(1).optional(),
  requiredSpecialties: z.array(z.string()).optional(),
  creativeTools: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  budgetType: z.enum(['fixed', 'range']).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  durationWeeks: z.number().int().min(1).max(52).optional(),
  targetStartDate: z.string().optional().or(z.literal('')),
  deadline: z.string().optional().or(z.literal('')),
  engagementType: z.enum(['milestone', 'retainer', 'one_off']).optional(),
  locationPreference: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  experienceLevel: z.enum(['any', 'intermediate', 'advanced', 'expert']).optional(),
  referenceUrls: z.array(z.string().url()).optional()
});

function generateSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${randomSuffix}`;
}

// GET /api/brand/briefs
export async function getMyBriefs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { status, page = '1', limit = '20' } = req.query;

    const query: Record<string, any> = { brandId: user._id };
    if (status && typeof status === 'string') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [briefs, total, statusCounts] = await Promise.all([
      CampaignBrief.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      CampaignBrief.countDocuments(query),
      CampaignBrief.aggregate([
        { $match: { brandId: user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const stats = {
      total: 0,
      draft: 0,
      published: 0,
      paused: 0,
      archived: 0
    };

    statusCounts.forEach((sc) => {
      const st = sc._id as keyof typeof stats;
      if (st in stats) {
        stats[st] = sc.count;
      }
      stats.total += sc.count;
    });

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
        },
        stats
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/briefs
export async function createBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const validatedData = createBriefSchema.parse(req.body);

    const brandProfile = await BrandProfile.findOne({ userId: user._id });
    const companyName = brandProfile?.companyName || user.name || 'Brand Partner';
    const companySlug = brandProfile?.companySlug || '';

    const slug = generateSlug(validatedData.title);

    const brief = new CampaignBrief({
      brandId: user._id,
      companyName,
      companySlug,
      title: validatedData.title,
      slug,
      summary: validatedData.summary || '',
      description: validatedData.description || '',
      category: validatedData.category,
      requiredSpecialties: validatedData.requiredSpecialties || [],
      creativeTools: validatedData.creativeTools || [],
      deliverables: validatedData.deliverables || [],
      budgetType: validatedData.budgetType,
      budgetMin: validatedData.budgetMin,
      budgetMax: validatedData.budgetMax,
      currency: validatedData.currency.toUpperCase(),
      durationWeeks: validatedData.durationWeeks,
      targetStartDate: validatedData.targetStartDate ? new Date(validatedData.targetStartDate) : undefined,
      deadline: validatedData.deadline ? new Date(validatedData.deadline) : undefined,
      engagementType: validatedData.engagementType,
      locationPreference: validatedData.locationPreference,
      experienceLevel: validatedData.experienceLevel,
      referenceUrls: validatedData.referenceUrls || [],
      status: 'draft'
    });

    await brief.save();

    res.status(201).json({
      success: true,
      message: 'Campaign brief created in draft mode.',
      data: brief
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/brand/briefs/:briefId
export async function getBriefById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found or not owned by you.' } });
      return;
    }

    res.status(200).json({ success: true, data: brief });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/brand/briefs/:briefId
export async function updateBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;
    const validatedData = updateBriefSchema.parse(req.body);

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found or not owned by you.' } });
      return;
    }

    if (validatedData.title !== undefined) {
      brief.title = validatedData.title;
    }
    if (validatedData.summary !== undefined) brief.summary = validatedData.summary;
    if (validatedData.description !== undefined) brief.description = validatedData.description;
    if (validatedData.category !== undefined) brief.category = validatedData.category;
    if (validatedData.requiredSpecialties !== undefined) brief.requiredSpecialties = validatedData.requiredSpecialties;
    if (validatedData.creativeTools !== undefined) brief.creativeTools = validatedData.creativeTools;
    if (validatedData.deliverables !== undefined) brief.deliverables = validatedData.deliverables;
    if (validatedData.budgetType !== undefined) brief.budgetType = validatedData.budgetType;
    if (validatedData.budgetMin !== undefined) brief.budgetMin = validatedData.budgetMin;
    if (validatedData.budgetMax !== undefined) brief.budgetMax = validatedData.budgetMax;
    if (validatedData.currency !== undefined) brief.currency = validatedData.currency.toUpperCase();
    if (validatedData.durationWeeks !== undefined) brief.durationWeeks = validatedData.durationWeeks;
    if (validatedData.targetStartDate !== undefined) {
      brief.targetStartDate = validatedData.targetStartDate ? new Date(validatedData.targetStartDate) : undefined;
    }
    if (validatedData.deadline !== undefined) {
      brief.deadline = validatedData.deadline ? new Date(validatedData.deadline) : undefined;
    }
    if (validatedData.engagementType !== undefined) brief.engagementType = validatedData.engagementType;
    if (validatedData.locationPreference !== undefined) brief.locationPreference = validatedData.locationPreference;
    if (validatedData.experienceLevel !== undefined) brief.experienceLevel = validatedData.experienceLevel;
    if (validatedData.referenceUrls !== undefined) brief.referenceUrls = validatedData.referenceUrls;

    // Validate budget min/max relation
    if (brief.budgetMin > brief.budgetMax) {
      res.status(400).json({ error: { code: 'INVALID_BUDGET_RANGE', message: 'Minimum budget cannot exceed maximum budget' } });
      return;
    }

    await brief.save();

    res.status(200).json({
      success: true,
      message: 'Campaign brief updated successfully.',
      data: brief
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/briefs/:briefId/publish
export async function publishBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found.' } });
      return;
    }

    if (brief.status === 'archived') {
      res.status(400).json({ error: { code: 'CANNOT_PUBLISH_ARCHIVED', message: 'Archived briefs cannot be directly republished.' } });
      return;
    }

    // Validation for publication
    if (!brief.title || brief.title.length < 3) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'A descriptive title is required to publish.' } });
      return;
    }
    if (!brief.description || brief.description.length < 20) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'A detailed project description (min 20 characters) is required to publish.' } });
      return;
    }
    if (!brief.deliverables || brief.deliverables.length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'At least one key deliverable is required to publish.' } });
      return;
    }

    brief.status = 'published';
    brief.publishedAt = new Date();
    await brief.save();

    res.status(200).json({
      success: true,
      message: 'Campaign brief published successfully and is now discoverable.',
      data: brief
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/briefs/:briefId/pause
export async function pauseBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found.' } });
      return;
    }

    if (brief.status !== 'published') {
      res.status(400).json({ error: { code: 'INVALID_STATE_TRANSITION', message: 'Only published briefs can be paused.' } });
      return;
    }

    brief.status = 'paused';
    await brief.save();

    res.status(200).json({
      success: true,
      message: 'Campaign brief has been paused.',
      data: brief
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/briefs/:briefId/resume
export async function resumeBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found.' } });
      return;
    }

    if (brief.status !== 'paused') {
      res.status(400).json({ error: { code: 'INVALID_STATE_TRANSITION', message: 'Only paused briefs can be resumed.' } });
      return;
    }

    brief.status = 'published';
    await brief.save();

    res.status(200).json({
      success: true,
      message: 'Campaign brief is active and published again.',
      data: brief
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/brand/briefs/:briefId/archive
export async function archiveBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found.' } });
      return;
    }

    brief.status = 'archived';
    await brief.save();

    res.status(200).json({
      success: true,
      message: 'Campaign brief archived.',
      data: brief
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/brand/briefs/:briefId
export async function deleteBrief(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { briefId } = req.params;

    const brief = await CampaignBrief.findOne({ _id: briefId, brandId: user._id });
    if (!brief) {
      res.status(404).json({ error: { code: 'BRIEF_NOT_FOUND', message: 'Campaign brief not found.' } });
      return;
    }

    await CampaignBrief.deleteOne({ _id: briefId, brandId: user._id });

    res.status(200).json({
      success: true,
      message: 'Campaign brief deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}
