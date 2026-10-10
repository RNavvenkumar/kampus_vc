import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BrandProfile } from '../models/BrandProfile.js';
import { User, IUser } from '../models/User.js';

export const updateBrandProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(120).optional(),
  companySlug: z.string().regex(/^[a-z0-9_-]{2,50}$/, 'Slug must be 2-50 characters alphanumeric').optional(),
  industry: z.string().min(1).optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+']).optional(),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  description: z.string().max(2500).optional(),
  logoUrl: z.string().url('Logo URL must be a valid URL').optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  contactName: z.string().min(1).max(100).optional(),
  contactRole: z.string().max(100).optional()
});

export async function getMyBrandProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    let profile = await BrandProfile.findOne({ userId: user._id });

    if (!profile) {
      profile = await BrandProfile.create({
        userId: user._id,
        companyName: user.name,
        contactName: user.name,
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

export async function updateMyBrandProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const validatedData = updateBrandProfileSchema.parse(req.body);

    let profile = await BrandProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new BrandProfile({
        userId: user._id,
        companyName: user.name,
        contactName: user.name
      });
    }

    if (validatedData.companyName !== undefined) profile.companyName = validatedData.companyName;
    if (validatedData.companySlug !== undefined) profile.companySlug = validatedData.companySlug;
    if (validatedData.industry !== undefined) profile.industry = validatedData.industry;
    if (validatedData.companySize !== undefined) profile.companySize = validatedData.companySize;
    if (validatedData.website !== undefined) profile.website = validatedData.website;
    if (validatedData.description !== undefined) profile.description = validatedData.description;
    if (validatedData.logoUrl !== undefined) profile.logoUrl = validatedData.logoUrl;
    if (validatedData.location !== undefined) profile.location = validatedData.location;
    if (validatedData.contactName !== undefined) profile.contactName = validatedData.contactName;
    if (validatedData.contactRole !== undefined) profile.contactRole = validatedData.contactRole;

    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Brand profile updated successfully.',
      data: profile
    });
  } catch (err) {
    next(err);
  }
}

export async function saveBrandOnboardingStep(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { step, data } = req.body;

    const validatedStep = z.number().min(1).max(4).parse(step);
    const validatedData = updateBrandProfileSchema.parse(data || {});

    let profile = await BrandProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new BrandProfile({
        userId: user._id,
        companyName: user.name,
        contactName: user.name
      });
    }

    Object.assign(profile, validatedData);
    profile.calculateCompletion();
    await profile.save();

    user.onboardingStep = Math.max(user.onboardingStep, validatedStep + 1);
    user.onboardingStatus = 'in_progress';
    await user.save();

    res.status(200).json({
      success: true,
      message: `Brand onboarding step ${validatedStep} saved successfully.`,
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

export async function completeBrandOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;

    let profile = await BrandProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new BrandProfile({
        userId: user._id,
        companyName: user.name,
        contactName: user.name
      });
    }

    profile.calculateCompletion();
    await profile.save();

    user.onboardingStatus = 'completed';
    user.onboardingStep = 4;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Brand onboarding completed successfully.',
      data: {
        user: user.toSafeObject(),
        profile
      }
    });
  } catch (err) {
    next(err);
  }
}
