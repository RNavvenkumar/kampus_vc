import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { CreatorProfile, IPortfolioItem } from '../models/CreatorProfile.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { IUser } from '../models/User.js';

export const portfolioItemSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
  category: z.string().min(1, 'Category is required').default('General'),
  tags: z.array(z.string()).optional().default([]),
  creativeTools: z.array(z.string()).optional().default([]),
  mediaType: z.enum(['image', 'video', 'project']).default('image'),
  mediaUrl: z.string().min(1, 'Media URL is required'),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  assetId: z.string().optional(),
  thumbnailAssetId: z.string().optional(),
  projectUrl: z.string().optional().or(z.literal('')),
  clientName: z.string().max(100).optional().or(z.literal('')),
  completionDate: z.string().optional().or(z.literal('')),
  isFeatured: z.boolean().optional().default(false),
  visibility: z.enum(['public', 'unlisted', 'private']).default('public')
});

export const updatePortfolioItemSchema = portfolioItemSchema.partial();

export const reorderPortfolioSchema = z.object({
  itemIds: z.array(z.string()).min(1, 'Item IDs array is required')
});

export async function getMyPortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const profile = await CreatorProfile.findOne({ userId: user._id });

    if (!profile) {
      res.status(200).json({ success: true, data: { items: [], total: 0 } });
      return;
    }

    const sortedItems = [...profile.portfolioItems].sort((a, b) => a.displayOrder - b.displayOrder);

    res.status(200).json({
      success: true,
      data: {
        items: sortedItems,
        total: sortedItems.length
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createPortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const validatedData = portfolioItemSchema.parse(req.body);

    let profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: user._id, displayName: user.name });
    }

    if (profile.portfolioItems.length >= 50) {
      res.status(400).json({
        error: {
          code: 'PORTFOLIO_LIMIT_EXCEEDED',
          message: 'You have reached the maximum allowed limit of 50 portfolio items.'
        }
      });
      return;
    }

    let assetIdObj: Types.ObjectId | undefined;
    if (validatedData.assetId) {
      if (!Types.ObjectId.isValid(validatedData.assetId)) {
        res.status(400).json({ error: { code: 'INVALID_ASSET_ID', message: 'Invalid asset ID' } });
        return;
      }
      const asset = await MediaAsset.findOne({ _id: validatedData.assetId, userId: user._id });
      if (!asset) {
        res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Referenced media asset not found or unauthorized' } });
        return;
      }
      if (asset.status !== 'ready') {
        res.status(400).json({ error: { code: 'ASSET_NOT_READY', message: `Media asset is in '${asset.status}' status and cannot be attached.` } });
        return;
      }
      asset.visibility = validatedData.visibility || 'public';
      assetIdObj = asset._id as Types.ObjectId;
      await asset.save();
    }

    let thumbnailAssetIdObj: Types.ObjectId | undefined;
    if (validatedData.thumbnailAssetId) {
      if (!Types.ObjectId.isValid(validatedData.thumbnailAssetId)) {
        res.status(400).json({ error: { code: 'INVALID_ASSET_ID', message: 'Invalid thumbnail asset ID' } });
        return;
      }
      const thumbAsset = await MediaAsset.findOne({ _id: validatedData.thumbnailAssetId, userId: user._id });
      if (thumbAsset && thumbAsset.status === 'ready') {
        thumbAsset.visibility = validatedData.visibility || 'public';
        thumbnailAssetIdObj = thumbAsset._id as Types.ObjectId;
        await thumbAsset.save();
      }
    }

    const newItem: IPortfolioItem = {
      id: new CreatorProfile()._id.toString(),
      title: validatedData.title,
      slug: validatedData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: validatedData.description || '',
      category: validatedData.category,
      tags: validatedData.tags || [],
      creativeTools: validatedData.creativeTools || [],
      mediaType: validatedData.mediaType,
      mediaUrl: validatedData.mediaUrl,
      thumbnailUrl: validatedData.thumbnailUrl || undefined,
      assetId: assetIdObj,
      thumbnailAssetId: thumbnailAssetIdObj,
      projectUrl: validatedData.projectUrl || undefined,
      clientName: validatedData.clientName || undefined,
      completionDate: validatedData.completionDate ? new Date(validatedData.completionDate) : undefined,
      isFeatured: validatedData.isFeatured || false,
      displayOrder: profile.portfolioItems.length,
      visibility: validatedData.visibility,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    profile.portfolioItems.push(newItem);
    profile.calculateCompletion();
    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Portfolio item created successfully.',
      data: newItem
    });
  } catch (err) {
    next(err);
  }
}

export async function getPortfolioItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { itemId } = req.params;

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const item = profile.portfolioItems.find((p) => p.id === itemId);
    if (!item) {
      res.status(404).json({ error: { code: 'PORTFOLIO_ITEM_NOT_FOUND', message: 'Portfolio item not found' } });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function updatePortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { itemId } = req.params;
    const validatedData = updatePortfolioItemSchema.parse(req.body);

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const itemIndex = profile.portfolioItems.findIndex((p) => p.id === itemId);
    if (itemIndex === -1) {
      res.status(404).json({ error: { code: 'PORTFOLIO_ITEM_NOT_FOUND', message: 'Portfolio item not found' } });
      return;
    }

    const currentItem = profile.portfolioItems[itemIndex];

    if (validatedData.assetId) {
      if (!Types.ObjectId.isValid(validatedData.assetId)) {
        res.status(400).json({ error: { code: 'INVALID_ASSET_ID', message: 'Invalid asset ID' } });
        return;
      }
      const asset = await MediaAsset.findOne({ _id: validatedData.assetId, userId: user._id });
      if (!asset) {
        res.status(404).json({ error: { code: 'ASSET_NOT_FOUND', message: 'Referenced media asset not found or unauthorized' } });
        return;
      }
      if (asset.status !== 'ready') {
        res.status(400).json({ error: { code: 'ASSET_NOT_READY', message: `Media asset is in '${asset.status}' status and cannot be attached.` } });
        return;
      }
      asset.visibility = (validatedData.visibility || currentItem.visibility) as any;
      currentItem.assetId = asset._id as Types.ObjectId;
      await asset.save();
    }

    if (validatedData.thumbnailAssetId) {
      if (!Types.ObjectId.isValid(validatedData.thumbnailAssetId)) {
        res.status(400).json({ error: { code: 'INVALID_ASSET_ID', message: 'Invalid thumbnail asset ID' } });
        return;
      }
      const thumbAsset = await MediaAsset.findOne({ _id: validatedData.thumbnailAssetId, userId: user._id });
      if (thumbAsset && thumbAsset.status === 'ready') {
        thumbAsset.visibility = (validatedData.visibility || currentItem.visibility) as any;
        currentItem.thumbnailAssetId = thumbAsset._id as Types.ObjectId;
        await thumbAsset.save();
      }
    }

    if (validatedData.title !== undefined) {
      currentItem.title = validatedData.title;
      currentItem.slug = validatedData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (validatedData.description !== undefined) currentItem.description = validatedData.description;
    if (validatedData.category !== undefined) currentItem.category = validatedData.category;
    if (validatedData.tags !== undefined) currentItem.tags = validatedData.tags;
    if (validatedData.creativeTools !== undefined) currentItem.creativeTools = validatedData.creativeTools;
    if (validatedData.mediaType !== undefined) currentItem.mediaType = validatedData.mediaType;
    if (validatedData.mediaUrl !== undefined) currentItem.mediaUrl = validatedData.mediaUrl;
    if (validatedData.thumbnailUrl !== undefined) currentItem.thumbnailUrl = validatedData.thumbnailUrl || undefined;
    if (validatedData.projectUrl !== undefined) currentItem.projectUrl = validatedData.projectUrl || undefined;
    if (validatedData.clientName !== undefined) currentItem.clientName = validatedData.clientName || undefined;
    if (validatedData.completionDate !== undefined) {
      currentItem.completionDate = validatedData.completionDate ? new Date(validatedData.completionDate) : undefined;
    }
    if (validatedData.isFeatured !== undefined) currentItem.isFeatured = validatedData.isFeatured;
    if (validatedData.visibility !== undefined) {
      currentItem.visibility = validatedData.visibility;
      // Sync visibility on attached media assets
      if (currentItem.assetId) {
        await MediaAsset.findByIdAndUpdate(currentItem.assetId, { visibility: validatedData.visibility });
      }
      if (currentItem.thumbnailAssetId) {
        await MediaAsset.findByIdAndUpdate(currentItem.thumbnailAssetId, { visibility: validatedData.visibility });
      }
    }
    currentItem.updatedAt = new Date();

    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio item updated successfully.',
      data: currentItem
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { itemId } = req.params;

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const item = profile.portfolioItems.find((p) => p.id === itemId);
    if (!item) {
      res.status(404).json({ error: { code: 'PORTFOLIO_ITEM_NOT_FOUND', message: 'Portfolio item not found' } });
      return;
    }

    profile.portfolioItems = profile.portfolioItems.filter((p) => p.id !== itemId);

    // Re-index displayOrder
    profile.portfolioItems.forEach((p, idx) => {
      p.displayOrder = idx;
    });

    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio item deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

export async function reorderPortfolio(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { itemIds } = reorderPortfolioSchema.parse(req.body);

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    // Check all IDs belong to this creator
    const existingMap = new Map(profile.portfolioItems.map((p) => [p.id, p]));
    const hasForeignIds = itemIds.some((id) => !existingMap.has(id));

    if (hasForeignIds) {
      res.status(400).json({
        error: {
          code: 'INVALID_REORDER_PAYLOAD',
          message: 'One or more portfolio IDs do not belong to your account.'
        }
      });
      return;
    }

    // Update display orders
    itemIds.forEach((id, index) => {
      const item = existingMap.get(id);
      if (item) {
        item.displayOrder = index;
      }
    });

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio reordered successfully.'
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleFeaturedItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { itemId } = req.params;

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const item = profile.portfolioItems.find((p) => p.id === itemId);
    if (!item) {
      res.status(404).json({ error: { code: 'PORTFOLIO_ITEM_NOT_FOUND', message: 'Portfolio item not found' } });
      return;
    }

    item.isFeatured = !item.isFeatured;
    item.updatedAt = new Date();
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Portfolio item ${item.isFeatured ? 'featured' : 'unfeatured'} successfully.`,
      data: item
    });
  } catch (err) {
    next(err);
  }
}
