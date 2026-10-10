import { CreatorProfile, ICreatorProfile, IPortfolioItem, IServiceItem } from '../models/CreatorProfile.js';
import { User } from '../models/User.js';

export interface CreatorSearchQuery {
  q?: string;
  category?: string;
  specialties?: string[] | string;
  creativeTools?: string[] | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  currency?: string;
  availability?: 'available' | 'limited' | 'busy' | 'All';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'All';
  sortBy?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'completion' | 'experience';
  page?: number | string;
  limit?: number | string;
}

export interface SafePublicCreator {
  id: string;
  displayName: string;
  username: string;
  headline: string;
  biography: string;
  avatarUrl?: string;
  coverUrl?: string;
  specialties: string[];
  creativeTools: string[];
  experienceLevel: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  hourlyRate?: number;
  currency: string;
  availability: string;
  availabilityNote?: string;
  availableFromDate?: Date;
  profileCompletion: number;
  portfolioItems: IPortfolioItem[];
  services: IServiceItem[];
  portfolioCount: number;
  servicesCount: number;
  startingPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorSearchResult {
  creators: SafePublicCreator[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  filtersApplied: {
    q?: string;
    category?: string;
    specialties: string[];
    creativeTools: string[];
    priceRange?: { min?: number; max?: number; currency?: string };
    availability?: string;
    experienceLevel?: string;
    sortBy: string;
  };
}

export class CreatorSearchService {
  /**
   * Search and filter creators with strict security, privacy projection, and eligibility checks.
   */
  async searchCreators(query: CreatorSearchQuery): Promise<CreatorSearchResult> {
    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(query.limit || 12), 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // 1. Base eligibility filter: Public profile visibility only
    const mongoFilter: Record<string, any> = {
      profileVisibility: 'public'
    };

    // Normalize array parameters (supports both comma-separated strings and arrays)
    const normalizedSpecialties: string[] = [];
    if (query.specialties) {
      if (Array.isArray(query.specialties)) {
        normalizedSpecialties.push(...query.specialties.filter((s) => typeof s === 'string' && s.trim().length > 0));
      } else if (typeof query.specialties === 'string' && query.specialties.trim().length > 0 && query.specialties !== 'All') {
        normalizedSpecialties.push(...query.specialties.split(',').map((s) => s.trim()).filter(Boolean));
      }
    }

    const normalizedTools: string[] = [];
    if (query.creativeTools) {
      if (Array.isArray(query.creativeTools)) {
        normalizedTools.push(...query.creativeTools.filter((t) => typeof t === 'string' && t.trim().length > 0));
      } else if (typeof query.creativeTools === 'string' && query.creativeTools.trim().length > 0 && query.creativeTools !== 'All') {
        normalizedTools.push(...query.creativeTools.split(',').map((t) => t.trim()).filter(Boolean));
      }
    }

    // 2. Text Search with ReDoS-safe escaping
    if (query.q && typeof query.q === 'string' && query.q.trim().length > 0) {
      const sanitizedQ = query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilter.$or = [
        { displayName: { $regex: sanitizedQ, $options: 'i' } },
        { username: { $regex: sanitizedQ, $options: 'i' } },
        { headline: { $regex: sanitizedQ, $options: 'i' } },
        { biography: { $regex: sanitizedQ, $options: 'i' } },
        { specialties: { $regex: sanitizedQ, $options: 'i' } },
        { creativeTools: { $regex: sanitizedQ, $options: 'i' } },
        { 'portfolioItems.title': { $regex: sanitizedQ, $options: 'i' } },
        { 'portfolioItems.tags': { $regex: sanitizedQ, $options: 'i' } },
        { 'portfolioItems.description': { $regex: sanitizedQ, $options: 'i' } },
        { 'services.title': { $regex: sanitizedQ, $options: 'i' } },
        { 'services.category': { $regex: sanitizedQ, $options: 'i' } }
      ];
    }

    // 3. Category / Specialties filter
    if (query.category && typeof query.category === 'string' && query.category !== 'All' && query.category.trim().length > 0) {
      const catSanitized = query.category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      mongoFilter.specialties = { $regex: new RegExp(catSanitized, 'i') };
    }

    if (normalizedSpecialties.length > 0) {
      const specRegexes = normalizedSpecialties.map((s) => new RegExp(s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      mongoFilter.specialties = { $in: specRegexes };
    }

    // 4. Creative Tools filter
    if (normalizedTools.length > 0) {
      const toolRegexes = normalizedTools.map((t) => new RegExp(t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
      mongoFilter.creativeTools = { $in: toolRegexes };
    }

    // 5. Availability filter
    if (query.availability && query.availability !== 'All' && ['available', 'limited', 'busy'].includes(query.availability)) {
      mongoFilter.availability = query.availability;
    }

    // 6. Experience Level filter
    if (query.experienceLevel && query.experienceLevel !== 'All' && ['beginner', 'intermediate', 'advanced', 'expert'].includes(query.experienceLevel)) {
      mongoFilter.experienceLevel = query.experienceLevel;
    }

    // 7. Pricing filter (checks active service price or hourly rate)
    const minP = query.minPrice ? Number(query.minPrice) : undefined;
    const maxP = query.maxPrice ? Number(query.maxPrice) : undefined;

    if ((minP !== undefined && !isNaN(minP)) || (maxP !== undefined && !isNaN(maxP))) {
      const priceConditions: any[] = [];

      if (minP !== undefined && !isNaN(minP)) {
        priceConditions.push({
          $or: [
            { 'services.price': { $gte: minP } },
            { hourlyRate: { $gte: minP } }
          ]
        });
      }

      if (maxP !== undefined && !isNaN(maxP)) {
        priceConditions.push({
          $or: [
            { 'services.price': { $lte: maxP } },
            { hourlyRate: { $lte: maxP } }
          ]
        });
      }

      if (priceConditions.length > 0) {
        if (!mongoFilter.$and) mongoFilter.$and = [];
        mongoFilter.$and.push(...priceConditions);
      }
    }

    // 8. Currency filter
    if (query.currency && typeof query.currency === 'string' && query.currency.trim().length > 0 && query.currency !== 'All') {
      mongoFilter.currency = query.currency.trim().toUpperCase();
    }

    // 9. Sorting Strategy
    const sortBy = query.sortBy || 'relevance';
    let sortOption: Record<string, any> = { profileCompletion: -1, createdAt: -1 };

    if (sortBy === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sortBy === 'price_asc') {
      sortOption = { hourlyRate: 1, 'services.price': 1 };
    } else if (sortBy === 'price_desc') {
      sortOption = { hourlyRate: -1, 'services.price': -1 };
    } else if (sortBy === 'experience') {
      sortOption = { experienceLevel: -1, profileCompletion: -1 };
    } else if (sortBy === 'completion') {
      sortOption = { profileCompletion: -1 };
    }

    // 10. Execute Query and Join with User to exclude suspended/inactive accounts
    const [rawProfiles, total] = await Promise.all([
      CreatorProfile.find(mongoFilter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-__v')
        .lean(),
      CreatorProfile.countDocuments(mongoFilter)
    ]);

    // Check account status of creator users
    const userIds = rawProfiles.map((p) => p.userId).filter(Boolean);
    const activeUsers = await User.find({
      _id: { $in: userIds },
      accountStatus: 'active'
    }).select('_id accountStatus').lean();

    const activeUserSet = new Set(activeUsers.map((u) => u._id.toString()));

    // 11. Sanitize, filter private portfolio items, and compute starting price
    const sanitizedCreators: SafePublicCreator[] = rawProfiles
      .filter((p) => p.userId && activeUserSet.has(p.userId.toString()))
      .map((p) => {
        const publicPortfolio = (p.portfolioItems || [])
          .filter((item) => item.visibility === 'public')
          .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || a.displayOrder - b.displayOrder);

        const activeServices = (p.services || []).filter((s) => s.status === 'active');

        // Calculate minimum starting price
        const servicePrices = activeServices.map((s) => s.price).filter((pr) => typeof pr === 'number' && pr > 0);
        const startingPrice = servicePrices.length > 0 ? Math.min(...servicePrices) : p.hourlyRate;

        return {
          id: p._id.toString(),
          displayName: p.displayName || 'Creator',
          username: p.username || `creator_${p._id.toString().slice(-6)}`,
          headline: p.headline || '',
          biography: p.biography || '',
          avatarUrl: p.avatarUrl,
          coverUrl: p.coverUrl,
          specialties: p.specialties || [],
          creativeTools: p.creativeTools || [],
          experienceLevel: p.experienceLevel || 'intermediate',
          location: p.location,
          website: p.website,
          socialLinks: p.socialLinks || {},
          hourlyRate: p.hourlyRate,
          currency: p.currency || 'USD',
          availability: p.availability || 'available',
          availabilityNote: p.availabilityNote,
          availableFromDate: p.availableFromDate,
          profileCompletion: p.profileCompletion || 0,
          portfolioItems: publicPortfolio,
          services: activeServices,
          portfolioCount: publicPortfolio.length,
          servicesCount: activeServices.length,
          startingPrice,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        };
      });

    return {
      creators: sanitizedCreators,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: sanitizedCreators.length < rawProfiles.length ? sanitizedCreators.length : total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total
      },
      filtersApplied: {
        q: query.q?.trim() || undefined,
        category: query.category && query.category !== 'All' ? query.category : undefined,
        specialties: normalizedSpecialties,
        creativeTools: normalizedTools,
        priceRange: (minP !== undefined || maxP !== undefined) ? { min: minP, max: maxP, currency: query.currency } : undefined,
        availability: query.availability && query.availability !== 'All' ? query.availability : undefined,
        experienceLevel: query.experienceLevel && query.experienceLevel !== 'All' ? query.experienceLevel : undefined,
        sortBy
      }
    };
  }
}

export const creatorSearchService = new CreatorSearchService();
