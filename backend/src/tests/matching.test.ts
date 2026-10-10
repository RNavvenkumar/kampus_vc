import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { CampaignBrief } from '../models/CampaignBrief.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

describe('Phase 6 — Explainable Creator–Campaign Matching Engine Tests', () => {
  let brandCookie: string;
  let otherBrandCookie: string;
  let brandUserId: string;
  let otherBrandUserId: string;
  let brief3dId: string;
  let briefEurId: string;
  let briefNoBudgetId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    // 1. Register Brand 1 (Owner)
    const resBrand = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Apex Studios Brand',
        email: 'apex@brand.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    brandCookie = resBrand.headers['set-cookie'] ? resBrand.headers['set-cookie'][0] : '';
    brandUserId = resBrand.body.data.user.id;

    // 2. Register Brand 2 (Foreign Brand for 403 tests)
    const resOtherBrand = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nexus Ventures',
        email: 'nexus@brand.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    otherBrandCookie = resOtherBrand.headers['set-cookie'] ? resOtherBrand.headers['set-cookie'][0] : '';
    otherBrandUserId = resOtherBrand.body.data.user.id;

    // 3. Create Creator 1 (Exceptional Match for 3D Cyberpunk Brief)
    const u1 = await User.create({
      name: 'Kai Vance',
      email: 'kai@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'active',
      onboardingStatus: 'completed'
    });

    await CreatorProfile.create({
      userId: u1._id,
      displayName: 'Kai Vance',
      username: 'kaivance_3d',
      specialties: ['3D Animation & Motion', 'Motion Graphics & VFX', 'Automotive 3D'],
      creativeTools: ['Blender', 'Unreal Engine', 'Cinema 4D', 'After Effects'],
      experienceLevel: 'expert',
      hourlyRate: 100,
      currency: 'USD',
      availability: 'available',
      profileVisibility: 'public',
      profileCompletion: 100,
      portfolioItems: [
        {
          id: 'port_kai_1',
          title: 'Cinematic Hypercar EV Launch',
          description: 'Cyberpunk 3D commercial with volumetric neon shaders rendered in Unreal Engine 5',
          category: '3D Animation & Motion',
          tags: ['Unreal Engine', 'Blender', 'Cyberpunk', 'Automotive', '3D Animation'],
          creativeTools: ['Unreal Engine', 'Blender'],
          mediaType: 'video',
          mediaUrl: 'https://cdn.example.com/kai_ev.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
          isFeatured: true,
          displayOrder: 0,
          visibility: 'public',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      services: [
        {
          id: 'srv_kai_1',
          title: '3D Commercial Package',
          description: 'Full 30s 4K 3D animation',
          category: '3D Animation & Motion',
          deliverables: ['4K MP4 Master'],
          revisions: 2,
          price: 4500,
          currency: 'USD',
          turnaroundDays: 21,
          packageTier: 'standard',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // 4. Create Creator 2 (AI Editorial Artist - EUR Currency)
    const u2 = await User.create({
      name: 'Elena Rostova',
      email: 'elena@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'active',
      onboardingStatus: 'completed'
    });

    await CreatorProfile.create({
      userId: u2._id,
      displayName: 'Elena Rostova',
      username: 'elena_ai',
      specialties: ['AI Art & Concept Direction', 'Brand Identity & Design'],
      creativeTools: ['Midjourney', 'Stable Diffusion', 'Photoshop'],
      experienceLevel: 'advanced',
      hourlyRate: 80,
      currency: 'EUR',
      availability: 'limited',
      profileVisibility: 'public',
      profileCompletion: 85,
      portfolioItems: [
        {
          id: 'port_elena_1',
          title: 'Luxury Botanical Fragrance Campaign',
          description: 'High-end AI editorial imagery for luxury skincare fragrance launch',
          category: 'AI Art & Concept Direction',
          tags: ['Luxury', 'Skincare', 'Midjourney', 'Editorial'],
          creativeTools: ['Midjourney', 'Photoshop'],
          mediaType: 'image',
          mediaUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
          thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9',
          isFeatured: true,
          displayOrder: 0,
          visibility: 'public',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      services: [
        {
          id: 'srv_elena_1',
          title: 'Editorial Key Visuals',
          description: 'Set of 6 high-res visuals',
          category: 'AI Art & Concept Direction',
          deliverables: ['6x TIFFs'],
          revisions: 2,
          price: 2000,
          currency: 'EUR',
          turnaroundDays: 7,
          packageTier: 'standard',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // 5. Create Creator 3 (General 2D Designer - Missing 3D skills)
    const u3 = await User.create({
      name: 'Sam Graphic',
      email: 'sam@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'active',
      onboardingStatus: 'completed'
    });

    await CreatorProfile.create({
      userId: u3._id,
      displayName: 'Sam Graphic',
      username: 'sam_graphics',
      specialties: ['Brand Identity & Design'],
      creativeTools: ['Figma', 'Illustrator'],
      experienceLevel: 'beginner',
      hourlyRate: 40,
      currency: 'USD',
      availability: 'busy',
      profileVisibility: 'public',
      profileCompletion: 60
    });

    // 6. Create Campaign Briefs owned by Brand 1
    const brief1 = await CampaignBrief.create({
      brandId: new mongoose.Types.ObjectId(brandUserId),
      companyName: 'Apex Studios',
      companySlug: 'apex-studios',
      title: '3D Kinetic EV Coupe Launch Commercial',
      slug: '3d-kinetic-ev-coupe-launch-commercial',
      summary: 'High-octane 3D animation blending neon cyberpunk visuals and volumetric shaders',
      description: 'We need a premier 3D artist skilled in Unreal Engine and Blender to render a 30-second automotive commercial.',
      category: '3D Animation & Motion',
      requiredSpecialties: ['3D Animation & Motion', 'Motion Graphics & VFX'],
      creativeTools: ['Unreal Engine', 'Blender'],
      deliverables: ['4K MP4 Master', 'Source Assets'],
      budgetMin: 3000,
      budgetMax: 6000,
      currency: 'USD',
      durationWeeks: 4,
      status: 'published'
    });
    brief3dId = brief1._id.toString();

    const brief2 = await CampaignBrief.create({
      brandId: new mongoose.Types.ObjectId(brandUserId),
      companyName: 'Apex Studios',
      companySlug: 'apex-studios',
      title: 'European Luxury Skincare Visual Campaign',
      slug: 'european-luxury-skincare-visual-campaign',
      summary: 'Editorial campaign in EUR',
      description: 'Need AI art direction for luxury botanical skincare launch.',
      category: 'AI Art & Concept Direction',
      requiredSpecialties: ['AI Art & Concept Direction'],
      creativeTools: ['Midjourney', 'Photoshop'],
      deliverables: ['Key Visuals'],
      budgetMin: 1500,
      budgetMax: 3000,
      currency: 'EUR',
      durationWeeks: 2,
      status: 'published'
    });
    briefEurId = brief2._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('GET /api/brand/briefs/:briefId/matches returns ranked matches with explainable breakdown', async () => {
    const res = await request(app)
      .get(`/api/brand/briefs/${brief3dId}/matches`)
      .set('Cookie', brandCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.matches).toBeInstanceOf(Array);
    expect(res.body.data.matches.length).toBeGreaterThanOrEqual(1);

    // Top match should be Kai Vance (3D / Unreal Engine expert)
    const topMatch = res.body.data.matches[0];
    expect(topMatch.creator.displayName).toBe('Kai Vance');
    expect(topMatch.overallScore).toBeGreaterThanOrEqual(85);
    expect(topMatch.matchGrade).toBe('Exceptional Match');

    // Verify Explainable Breakdown
    expect(topMatch.breakdown.specialties.score).toBe(35);
    expect(topMatch.breakdown.specialties.matched).toContain('3D Animation & Motion');
    expect(topMatch.breakdown.specialties.matched).toContain('Motion Graphics & VFX');

    expect(topMatch.breakdown.tools.score).toBe(25);
    expect(topMatch.breakdown.tools.matched).toContain('Unreal Engine');
    expect(topMatch.breakdown.tools.matched).toContain('Blender');

    // Verify Verified Portfolio Evidence
    expect(topMatch.breakdown.portfolioEvidence.citedItems.length).toBeGreaterThanOrEqual(1);
    expect(topMatch.breakdown.portfolioEvidence.citedItems[0].title).toBe('Cinematic Hypercar EV Launch');
    expect(topMatch.breakdown.portfolioEvidence.citedItems[0].thumbnailUrl).toBeDefined();

    // Verify Budget Alignment
    expect(topMatch.breakdown.budget.status).toBe('compatible');
    expect(topMatch.breakdown.budget.currencyMatch).toBe(true);

    // Verify Strengths and Gaps
    expect(topMatch.strengths).toBeInstanceOf(Array);
    expect(topMatch.strengths.length).toBeGreaterThan(0);
  });

  it('correctly reports currency mismatch when creator currency differs from campaign currency', async () => {
    // Check Kai Vance (USD) against European brief (EUR)
    const res = await request(app)
      .get(`/api/brand/briefs/${briefEurId}/matches`)
      .set('Cookie', brandCookie);

    expect(res.status).toBe(200);
    const matches = res.body.data.matches;

    // Top match for European AI brief should be Elena Rostova
    const elenaMatch = matches.find((m: any) => m.creator.displayName === 'Elena Rostova');
    expect(elenaMatch).toBeDefined();
    expect(elenaMatch.breakdown.budget.currencyMatch).toBe(true);
    expect(elenaMatch.breakdown.budget.status).toBe('compatible');

    // Kai Vance should have currency mismatch noted
    const kaiMatch = matches.find((m: any) => m.creator.displayName === 'Kai Vance');
    if (kaiMatch) {
      expect(kaiMatch.breakdown.budget.currencyMatch).toBe(false);
      expect(kaiMatch.breakdown.budget.status).toBe('unknown');
      expect(kaiMatch.breakdown.budget.explanation).toContain('Currency mismatch');
    }
  });

  it('correctly penalizes missing skills and busy availability for non-matching creators', async () => {
    const res = await request(app)
      .get(`/api/brand/briefs/${brief3dId}/matches`)
      .set('Cookie', brandCookie);

    expect(res.status).toBe(200);
    const samMatch = res.body.data.matches.find((m: any) => m.creator.displayName === 'Sam Graphic');
    expect(samMatch).toBeDefined();
    expect(samMatch.overallScore).toBeLessThan(50);
    expect(samMatch.matchGrade).toBe('Potential Match');
    expect(samMatch.breakdown.availability.status).toBe('busy');
    expect(samMatch.gaps.length).toBeGreaterThan(0);
  });

  it('forbids foreign brands from inspecting matches for briefs they do not own (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/brand/briefs/${brief3dId}/matches`)
      .set('Cookie', otherBrandCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent campaign brief ID', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/brand/briefs/${nonExistentId}/matches`)
      .set('Cookie', brandCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CAMPAIGN_NOT_FOUND');
  });
});
