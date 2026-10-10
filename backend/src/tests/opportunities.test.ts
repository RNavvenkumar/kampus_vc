import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CampaignProposal } from '../models/CampaignProposal.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

describe('Phase 6 — Creator Opportunity Discovery & Personalized Matching Tests', () => {
  let creatorCookie: string;
  let brandCookie: string;
  let creatorUserId: string;
  let brandUserId: string;
  let matchingBriefId: string;
  let nonMatchingBriefId: string;
  let draftBriefId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    // 1. Register Creator
    const resCreator = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Tanya Fox',
        email: 'tanya@creators.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    creatorCookie = resCreator.headers['set-cookie'] ? resCreator.headers['set-cookie'][0] : '';
    creatorUserId = resCreator.body.data.user.id;

    // Complete Creator profile with 3D Motion specialties
    await CreatorProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(creatorUserId) },
      {
        $set: {
          displayName: 'Tanya Fox',
          username: 'tanyafox_3d',
          specialties: ['3D Animation & Motion', 'Motion Graphics & VFX'],
          creativeTools: ['Blender', 'Cinema 4D', 'After Effects'],
          experienceLevel: 'advanced',
          hourlyRate: 85,
          currency: 'USD',
          availability: 'available',
          profileVisibility: 'public',
          profileCompletion: 90,
          portfolioItems: [
            {
              id: 'port_tanya_1',
              title: 'Stylized 3D Fluid Motion',
              category: '3D Animation & Motion',
              tags: ['Blender', 'Cinema 4D', '3D Animation'],
              mediaType: 'video',
              mediaUrl: 'https://cdn.example.com/fluid.mp4',
              visibility: 'public'
            }
          ]
        }
      }
    );

    // 2. Register Brand
    const resBrand = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Vortex Energy Brand',
        email: 'vortex@brand.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    brandCookie = resBrand.headers['set-cookie'] ? resBrand.headers['set-cookie'][0] : '';
    brandUserId = resBrand.body.data.user.id;

    // 3. Create Published Brief matching Tanya (3D Animation)
    const b1 = await CampaignBrief.create({
      brandId: new mongoose.Types.ObjectId(brandUserId),
      companyName: 'Vortex Energy',
      companySlug: 'vortex-energy',
      title: 'Neon Kinetic 3D Product Loop',
      slug: 'neon-kinetic-3d-product-loop',
      summary: 'Seeking 3D motion animator with Blender & Cinema 4D mastery for energy drink loop',
      description: 'Render a 15-second kinetic loop with stylized fluid dynamics and neon glass textures.',
      category: '3D Animation & Motion',
      requiredSpecialties: ['3D Animation & Motion'],
      creativeTools: ['Blender', 'Cinema 4D'],
      deliverables: ['4K MP4 Loop', 'Alpha Channel MOV'],
      budgetMin: 2500,
      budgetMax: 5000,
      currency: 'USD',
      durationWeeks: 3,
      status: 'published'
    });
    matchingBriefId = b1._id.toString();

    // 4. Create Published Brief not matching Tanya (Audio Design)
    const b2 = await CampaignBrief.create({
      brandId: new mongoose.Types.ObjectId(brandUserId),
      companyName: 'Vortex Energy',
      companySlug: 'vortex-energy',
      title: 'Original Podcast Theme & Sound Design',
      slug: 'original-podcast-theme-sound-design',
      summary: 'Looking for a composer and sound engineer',
      description: 'Audio production and mixing for corporate podcast series.',
      category: 'Audio & Sound Design',
      requiredSpecialties: ['Audio & Sound Design'],
      creativeTools: ['Ableton Live', 'Pro Tools'],
      deliverables: ['Stereo Master WAV'],
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'USD',
      durationWeeks: 2,
      status: 'published'
    });
    nonMatchingBriefId = b2._id.toString();

    // 5. Create Draft Brief (should be excluded from opportunities)
    const b3 = await CampaignBrief.create({
      brandId: new mongoose.Types.ObjectId(brandUserId),
      companyName: 'Vortex Energy',
      companySlug: 'vortex-energy',
      title: 'Confidential Internal Draft Brief',
      slug: 'confidential-internal-draft-brief',
      summary: 'Draft unreleased project',
      description: 'Not yet ready for creator discovery.',
      category: '3D Animation & Motion',
      status: 'draft'
    });
    draftBriefId = b3._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('GET /api/creator/opportunities returns published campaigns ranked by match score', async () => {
    const res = await request(app)
      .get('/api/creator/opportunities')
      .set('Cookie', creatorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.opportunities).toBeInstanceOf(Array);
    expect(res.body.data.opportunities.length).toBe(2); // Draft brief is strictly excluded

    // Top ranked opportunity should be the 3D Motion brief
    const topOpportunity = res.body.data.opportunities[0];
    expect(topOpportunity.id).toBe(matchingBriefId);
    expect(topOpportunity.title).toBe('Neon Kinetic 3D Product Loop');
    expect(topOpportunity.matchScore).toBeGreaterThanOrEqual(80);
    expect(topOpportunity.matchedSpecialties).toContain('3D Animation & Motion');
    expect(topOpportunity.matchedTools).toContain('Blender');
    expect(topOpportunity.matchedTools).toContain('Cinema 4D');
    expect(topOpportunity.proposalStatus).toBe('none');
  });

  it('annotates opportunity with active proposal status if creator has already pitched', async () => {
    // Submit a proposal to the matching brief
    const proposal = await CampaignProposal.create({
      proposalReference: 'PROP-TANYA-001',
      creatorId: new mongoose.Types.ObjectId(creatorUserId),
      briefId: new mongoose.Types.ObjectId(matchingBriefId),
      brandId: new mongoose.Types.ObjectId(brandUserId),
      pitchTitle: 'Dynamic Neon 3D Commercial Pitch',
      pitchMessage: 'I have 5 years experience rendering kinetic 3D fluid loops with Cinema 4D and Blender.',
      proposedPrice: 3800,
      currency: 'USD',
      deliveryDurationWeeks: 3,
      deliverables: ['4K MP4 Loop', 'Alpha Channel MOV'],
      status: 'submitted',
      revisionNumber: 1
    });

    const res = await request(app)
      .get('/api/creator/opportunities')
      .set('Cookie', creatorCookie);

    expect(res.status).toBe(200);
    const opportunity = res.body.data.opportunities.find((o: any) => o.id === matchingBriefId);
    expect(opportunity).toBeDefined();
    expect(opportunity.proposalStatus).toBe('submitted');
    expect(opportunity.proposalId).toBe(proposal._id.toString());
  });

  it('GET /api/creator/opportunities/:briefId/compatibility returns single campaign compatibility', async () => {
    const res = await request(app)
      .get(`/api/creator/opportunities/${matchingBriefId}/compatibility`)
      .set('Cookie', creatorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.evaluation).toBeDefined();
    expect(res.body.data.evaluation.overallScore).toBeGreaterThanOrEqual(80);
  });

  it('forbids brand accounts from accessing creator opportunities (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/creator/opportunities')
      .set('Cookie', brandCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/creator/opportunities');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
