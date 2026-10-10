import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CreatorProfile, IServiceItem } from '../models/CreatorProfile.js';
import { IUser } from '../models/User.js';

export const serviceItemSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().max(1500, 'Description cannot exceed 1500 characters').optional().default(''),
  category: z.string().min(1, 'Category is required').default('Creative Production'),
  deliverables: z.array(z.string()).min(1, 'At least one deliverable is required'),
  revisions: z.number().int().min(0).max(20).default(2),
  price: z.number().min(5, 'Minimum service price is ₹5'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('INR'),
  turnaroundDays: z.number().int().min(1, 'Turnaround must be at least 1 day').max(365, 'Turnaround cannot exceed 365 days'),
  packageTier: z.enum(['starter', 'standard', 'premium']).default('standard'),
  status: z.enum(['active', 'inactive']).default('active')
});

export const updateServiceItemSchema = serviceItemSchema.partial();

export const availabilitySchema = z.object({
  availability: z.enum(['available', 'limited', 'busy']),
  availabilityNote: z.string().max(280, 'Note cannot exceed 280 characters').optional().or(z.literal('')),
  availableFromDate: z.string().optional().or(z.literal(''))
});

// GET /api/creator/services
export async function getMyServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const profile = await CreatorProfile.findOne({ userId: user._id });

    if (!profile) {
      res.status(200).json({ success: true, data: { services: [], total: 0 } });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        services: profile.services || [],
        total: (profile.services || []).length
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/creator/services
export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const validatedData = serviceItemSchema.parse(req.body);

    let profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: user._id, displayName: user.name });
    }

    if (profile.services.length >= 20) {
      res.status(400).json({
        error: {
          code: 'SERVICE_LIMIT_EXCEEDED',
          message: 'You have reached the maximum allowed limit of 20 services.'
        }
      });
      return;
    }

    const newService: IServiceItem = {
      id: new CreatorProfile()._id.toString(),
      title: validatedData.title,
      description: validatedData.description || '',
      category: validatedData.category,
      deliverables: validatedData.deliverables,
      revisions: validatedData.revisions,
      price: validatedData.price,
      currency: validatedData.currency.toUpperCase(),
      turnaroundDays: validatedData.turnaroundDays,
      packageTier: validatedData.packageTier,
      status: validatedData.status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    profile.services.push(newService);
    profile.calculateCompletion();
    await profile.save();

    res.status(201).json({
      success: true,
      message: 'Service package created successfully.',
      data: newService
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creator/services/:serviceId
export async function getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { serviceId } = req.params;

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const service = profile.services.find((s) => s.id === serviceId);
    if (!service) {
      res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      return;
    }

    res.status(200).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/creator/services/:serviceId
export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { serviceId } = req.params;
    const validatedData = updateServiceItemSchema.parse(req.body);

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const serviceIndex = profile.services.findIndex((s) => s.id === serviceId);
    if (serviceIndex === -1) {
      res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      return;
    }

    const currentService = profile.services[serviceIndex];

    if (validatedData.title !== undefined) currentService.title = validatedData.title;
    if (validatedData.description !== undefined) currentService.description = validatedData.description;
    if (validatedData.category !== undefined) currentService.category = validatedData.category;
    if (validatedData.deliverables !== undefined) currentService.deliverables = validatedData.deliverables;
    if (validatedData.revisions !== undefined) currentService.revisions = validatedData.revisions;
    if (validatedData.price !== undefined) currentService.price = validatedData.price;
    if (validatedData.currency !== undefined) currentService.currency = validatedData.currency.toUpperCase();
    if (validatedData.turnaroundDays !== undefined) currentService.turnaroundDays = validatedData.turnaroundDays;
    if (validatedData.packageTier !== undefined) currentService.packageTier = validatedData.packageTier;
    if (validatedData.status !== undefined) currentService.status = validatedData.status;
    currentService.updatedAt = new Date();

    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: currentService
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/creator/services/:serviceId
export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { serviceId } = req.params;

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const initialLength = profile.services.length;
    profile.services = profile.services.filter((s) => s.id !== serviceId);

    if (profile.services.length === initialLength) {
      res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      return;
    }

    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/creator/services/:serviceId/status
export async function toggleServiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const { serviceId } = req.params;

    const profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Creator profile not found' } });
      return;
    }

    const service = profile.services.find((s) => s.id === serviceId);
    if (!service) {
      res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      return;
    }

    service.status = service.status === 'active' ? 'inactive' : 'active';
    service.updatedAt = new Date();
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Service status changed to ${service.status}.`,
      data: service
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/creator/availability
export async function getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const profile = await CreatorProfile.findOne({ userId: user._id });

    if (!profile) {
      res.status(200).json({
        success: true,
        data: {
          availability: 'available',
          availabilityNote: '',
          availableFromDate: null
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        availability: profile.availability,
        availabilityNote: profile.availabilityNote || '',
        availableFromDate: profile.availableFromDate || null,
        updatedAt: profile.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/creator/availability
export async function updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const validatedData = availabilitySchema.parse(req.body);

    let profile = await CreatorProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CreatorProfile({ userId: user._id, displayName: user.name });
    }

    profile.availability = validatedData.availability;
    profile.availabilityNote = validatedData.availabilityNote || undefined;
    profile.availableFromDate = validatedData.availableFromDate ? new Date(validatedData.availableFromDate) : undefined;
    
    profile.calculateCompletion();
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully.',
      data: {
        availability: profile.availability,
        availabilityNote: profile.availabilityNote,
        availableFromDate: profile.availableFromDate,
        updatedAt: profile.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
}
