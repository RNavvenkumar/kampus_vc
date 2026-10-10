import { Request, Response, NextFunction } from 'express';
import { creatorSearchService, CreatorSearchQuery } from '../services/creatorSearchService.js';
import { aiSearchIntentService } from '../services/aiSearchIntentService.js';

/**
 * GET /api/creators/search & GET /api/creators
 * Search and discover creators with rich filtering, privacy guards, and pagination.
 */
export async function searchCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query: CreatorSearchQuery = {
      q: req.query.q as string,
      category: req.query.category as string,
      specialties: req.query.specialties as string | string[],
      creativeTools: (req.query.creativeTools || req.query.tool) as string | string[],
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      currency: req.query.currency as string,
      availability: req.query.availability as any,
      experienceLevel: req.query.experienceLevel as any,
      sortBy: (req.query.sort || req.query.sortBy) as any,
      page: req.query.page as any,
      limit: req.query.limit as any
    };

    const result = await creatorSearchService.searchCreators(query);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/creators/parse-search-intent
 * Natural language intent parser converting text queries into structured filter attributes.
 */
export async function parseSearchIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Query string is required in request body.'
        }
      });
      return;
    }

    const intent = await aiSearchIntentService.parseSearchIntent(query);

    res.status(200).json({
      success: true,
      data: intent
    });
  } catch (err) {
    next(err);
  }
}
