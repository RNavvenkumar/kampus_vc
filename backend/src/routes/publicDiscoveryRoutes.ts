import { Router } from 'express';
import {
  getPublicBriefs,
  getPublicBriefByIdOrSlug,
  getPublicCreatorByUsernameOrId
} from '../controllers/publicDiscoveryController.js';
import {
  searchCreators,
  parseSearchIntent
} from '../controllers/creatorDiscoveryController.js';
import { getCampaignMatches } from '../controllers/matchingController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const publicBriefsRouter = Router();
publicBriefsRouter.get('/', getPublicBriefs);
publicBriefsRouter.get('/:briefId/matches', requireAuth, requireRole('brand', 'admin'), getCampaignMatches);
publicBriefsRouter.get('/:briefIdOrSlug', getPublicBriefByIdOrSlug);

export const publicCreatorsRouter = Router();
publicCreatorsRouter.get('/search', searchCreators);
publicCreatorsRouter.post('/parse-search-intent', parseSearchIntent);
publicCreatorsRouter.get('/', searchCreators);
publicCreatorsRouter.get('/:usernameOrId', getPublicCreatorByUsernameOrId);
