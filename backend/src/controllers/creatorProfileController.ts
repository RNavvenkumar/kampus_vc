import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { User, IUser } from '../models/User.js';

const portfolioItemInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Portfolio title is required').max(120),
  description: z.string().max(1000).optional().default(''),
  category: z.string().optional().default('General'),
  mediaUrl: z.string().url('Media URL must be a valid web address'),
  projectUrl: z.string().url('Project URL must be a valid web address').optional().or(z.literal('')),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([])
});

export const updateCreatorProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  username: z.string().regex(/^[a-z0-9_.-]{3,30}$/, 'Username must be 3-30 characters alphanumeric').optional(),
  headline: z.string().max(180).optional(),
  biography: z.string().max(2500).optional(),
  specialties: z.array(z.string()).optional(),
  creativeTools: z.array(z.string()).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  socialLinks: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    github: z.string().optional(),
    artstation: z.string().optional(),
    behance: z.string().optional(),
    linkedin: z.string().optional()
  }).optional(),
  hourlyRate: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  availability: z.enum(['available', 'limited', 'busy']).optional(),
  portfolioItems: z.array(portfolioItemInputSchema).optional(),
  profileVisibility: z.enum(['public', 'unlisted', 'private']).optional()
});

export async function getMyCreatorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    let profile = await CreatorProfile.findOne({ userId: user._id });

    if (!profile) {
      profile = await CreatorProfile.create({
        userId: user._id,
        displayName: user.name,
        profileCompletion: 20
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMyCreatorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const validatedData = updateCreatorProfileSchema.parse(req.body);

    let profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: user._id, displayName: user.name });
    }

    // Whitelist assignment (explicitly prevent modifying userId or internal security fields)
    if (validatedData.displayName !== undefined) profile.displayName = validatedData.displayName;
    if (validatedData.username !== undefined) profile.username = validatedData.username;
    if (validatedData.headline !== undefined) profile.headline = validatedData.headline;
    if (validatedData.biography !== undefined) profile.biography = validatedData.biography;
    if (validatedData.specialties !== undefined) profile.specialties = validatedData.specialties;
    if (validatedData.creativeTools !== undefined) profile.creativeTools = validatedData.creativeTools;
    if (validatedData.experienceLevel !== undefined) profile.experienceLevel = validatedData.experienceLevel;
    if (validatedData.location !== undefined) profile.location = validatedData.location;
    if (validatedData.website !== undefined) profile.website = validatedData.website;
    if (validatedData.socialLinks !== undefined) profile.socialLinks = validatedData.socialLinks;
    if (validatedData.hourlyRate !== undefined) profile.hourlyRate = validatedData.hourlyRate;
    if (validatedData.currency !== undefined) profile.currency = validatedData.currency;
    if (validatedData.availability !== undefined) profile.availability = validatedData.availability;
    if (validatedData.portfolioItems !== undefined) {
      profile.portfolioItems = validatedData.portfolioItems.map((item, idx) => ({
        id: item.id || new CreatorProfile()._id.toString(),
        title: item.title,
        description: item.description || '',
        category: item.category || 'General',
        mediaUrl: item.mediaUrl,
        projectUrl: item.projectUrl || undefined,
        thumbnailUrl: item.thumbnailUrl || undefined,
        tags: item.tags || [],
        creativeTools: [],
        mediaType: 'image',
        isFeatured: false,
        displayOrder: idx,
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }
    if (validatedData.profileVisibility !== undefined) profile.profileVisibility = validatedData.profileVisibility;

    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Creator profile updated successfully.',
      data: profile
    });
  } catch (err) {
    next(err);
  }
}

export async function saveCreatorOnboardingStep(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { step, data } = req.body;

    const validatedStep = z.number().min(1).max(5).parse(step);
    const validatedData = updateCreatorProfileSchema.parse(data || {});

    let profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: user._id, displayName: user.name });
    }

    Object.assign(profile, validatedData);
    profile.calculateCompletion();
    await profile.save();

    // Update user onboarding step
    user.onboardingStep = Math.max(user.onboardingStep, validatedStep + 1);
    user.onboardingStatus = 'in_progress';
    await user.save();

    res.status(200).json({
      success: true,
      message: `Onboarding step ${validatedStep} saved successfully.`,
      data: {
        profile,
        onboardingStep: user.onboardingStep,
        onboardingStatus: user.onboardingStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function completeCreatorOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;

    let profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: user._id, displayName: user.name });
    }

    profile.calculateCompletion();
    await profile.save();

    user.onboardingStatus = 'completed';
    user.onboardingStep = 5;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Creator onboarding completed successfully.',
      data: {
        user: user.toSafeObject(),
        profile
      }
    });
  } catch (err) {
    next(err);
  }
}
