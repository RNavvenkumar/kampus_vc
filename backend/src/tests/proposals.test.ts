import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CampaignProposal } from '../models/CampaignProposal.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { BrandProfile } from '../models/BrandProfile.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
  await CampaignBrief.deleteMany({});
  await CampaignProposal.deleteMany({});
  await CreatorProfile.deleteMany({});
  await BrandProfile.deleteMany({});
});

describe('Phase 4 — Creator Proposals & Validation Tests', () => {
  async function createBrand(name = 'Acme Brand', email = 'brand@acme.com') {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    const cookie = res.headers['set-cookie'][0];

    // Create a published campaign brief
    const briefRes = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', cookie)
      .send({
        title: '3D Cyberpunk Character Concept',
        category: '3D Art & Modeling',
        summary: 'Hero character modeling for next-gen game',
        description: 'Complete high-poly and low-poly game-ready character model with textures',
        budgetMin: 2000,
        budgetMax: 4000,
        currency: 'USD',
        durationWeeks: 4,
        deliverables: ['High-poly sculpt', 'Game-ready textured mesh']
      });

    const briefId = briefRes.body.data.id;

    // Publish brief
    await request(app)
      .post(`/api/brand/briefs/${briefId}/publish`)
      .set('Cookie', cookie);

    return { user: res.body.data.user, cookie, briefId };
  }

  async function createCreator(name = 'Elena Vance', email = 'elena@creative.io') {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    const cookie = res.headers['set-cookie'][0];

    // Complete onboarding & add portfolio item
    await request(app)
      .patch('/api/creator/profile/me')
      .set('Cookie', cookie)
      .send({
        displayName: name,
        headline: 'Lead 3D & AI Concept Artist',
        biography: 'Over 8 years crafting AAA game characters and cinematic assets.',
        specialties: ['3D Art & Modeling', 'Concept Art']
      });

    const itemRes = await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Cyberpunk Mech Soldier',
        description: 'ZBrush sculpt and Substance textured hero character',
        category: '3D Art & Modeling',
        mediaType: 'image',
        mediaUrl: 'https://cdn.kampus.vc/portfolio/mech.jpg',
        visibility: 'public'
      });

    const portfolioItemId = itemRes.body.data.id;

    return { user: res.body.data.user, cookie, portfolioItemId };
  }

  it('rejects unauthenticated requests to proposal endpoints', async () => {
    const res = await request(app).get('/api/creator/proposals');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects brand users attempting to access creator proposal endpoints', async () => {
    const brand = await createBrand();
    const res = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', brand.cookie)
      .send({ briefId: brand.briefId, pitchMessage: 'Trying as brand' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a creator to save a draft proposal and retrieve it', async () => {
    const brand = await createBrand();
    const creator = await createCreator();

    const saveRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchTitle: 'High-Fidelity Cyberpunk Character Workflow',
        pitchMessage: 'I have extensive experience with game-ready pipeline and texturing.',
        referencedPortfolioItemIds: [creator.portfolioItemId],
        proposedPrice: 3200,
        currency: 'USD',
        deliveryDurationWeeks: 3,
        deliverables: ['High-poly ZBrush sculpt', 'Textured FBX character'],
        milestones: [
          { title: 'Concept blockout', amount: 1200, durationWeeks: 1, order: 1 },
          { title: 'Final sculpt & texturing', amount: 2000, durationWeeks: 2, order: 2 }
        ],
        isDraft: true
      });

    expect(saveRes.status).toBe(201);
    expect(saveRes.body.data.status).toBe('draft');
    expect(saveRes.body.data.proposalReference).toMatch(/^PROP-/);

    const proposalId = saveRes.body.data.id;

    // Fetch proposal by ID
    const getRes = await request(app)
      .get(`/api/creator/proposals/${proposalId}`)
      .set('Cookie', creator.cookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.status).toBe('draft');
    expect(getRes.body.data.referencedPortfolio).toHaveLength(1);
    expect(getRes.body.data.referencedPortfolio[0].title).toBe('Cyberpunk Mech Soldier');
  });

  it('validates proposal pricing, pitch length, and milestone sum', async () => {
    const brand = await createBrand();
    const creator = await createCreator();

    // 1. Pitch message too short
    const shortPitchRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Hi pick me',
        proposedPrice: 2000,
        deliveryDurationWeeks: 2,
        deliverables: ['Deliverable 1']
      });
    expect(shortPitchRes.status).toBe(400);

    // 2. Proposed price non-positive
    const negPriceRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Detailed comprehensive proposal message exceeding twenty characters.',
        proposedPrice: -500,
        deliveryDurationWeeks: 2,
        deliverables: ['Deliverable 1']
      });
    expect(negPriceRes.status).toBe(400);

    // 3. Milestone sum mismatch
    const sumMismatchRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Detailed comprehensive proposal message exceeding twenty characters.',
        proposedPrice: 3000,
        currency: 'USD',
        deliveryDurationWeeks: 3,
        deliverables: ['Deliverable 1'],
        milestones: [
          { title: 'Milestone 1', amount: 1000, order: 1 },
          { title: 'Milestone 2', amount: 1000, order: 2 } // sum 2000 != 3000
        ]
      });
    expect(sumMismatchRes.status).toBe(400);
    expect(sumMismatchRes.body.error.code).toBe('MILESTONE_SUM_MISMATCH');
  });

  it('rejects foreign portfolio item references belonging to another creator', async () => {
    const brand = await createBrand();
    const creator1 = await createCreator('Creator 1', 'c1@test.com');
    const creator2 = await createCreator('Creator 2', 'c2@test.com');

    // Creator 2 tries to reference Creator 1's portfolio item
    const res = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator2.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Detailed proposal with stolen portfolio reference item.',
        referencedPortfolioItemIds: [creator1.portfolioItemId],
        proposedPrice: 2500,
        deliveryDurationWeeks: 3,
        deliverables: ['Asset 1']
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_ASSET_REFERENCE');
  });

  it('prevents duplicate active proposal submissions for the same campaign', async () => {
    const brand = await createBrand();
    const creator = await createCreator();

    // First proposal submission
    const res1 = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'First proposal submitted to brand campaign brief.',
        proposedPrice: 2500,
        currency: 'USD',
        deliveryDurationWeeks: 2,
        deliverables: ['Deliverable 1'],
        isDraft: false
      });
    expect(res1.status).toBe(201);
    expect(res1.body.data.status).toBe('submitted');

    // Attempting to submit another active proposal
    const res2 = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Second competing proposal by same creator.',
        proposedPrice: 2000,
        currency: 'USD',
        deliveryDurationWeeks: 2,
        deliverables: ['Deliverable 2'],
        isDraft: false
      });
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('DUPLICATE_PROPOSAL');
  });

  it('allows creator to edit draft and submit it', async () => {
    const brand = await createBrand();
    const creator = await createCreator();

    // Create draft
    const draftRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Initial draft message with at least twenty characters.',
        proposedPrice: 2500,
        currency: 'USD',
        deliveryDurationWeeks: 3,
        deliverables: ['Draft Deliverable'],
        isDraft: true
      });
    const proposalId = draftRes.body.data.id;

    // Patch draft
    const patchRes = await request(app)
      .patch(`/api/creator/proposals/${proposalId}`)
      .set('Cookie', creator.cookie)
      .send({
        pitchTitle: 'Updated Polished Concept Pitch',
        proposedPrice: 2800
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.proposedPrice).toBe(2800);
    expect(patchRes.body.data.pitchTitle).toBe('Updated Polished Concept Pitch');

    // Submit proposal
    const submitRes = await request(app)
      .post(`/api/creator/proposals/${proposalId}/submit`)
      .set('Cookie', creator.cookie);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');
  });

  it('allows creator to withdraw an eligible proposal', async () => {
    const brand = await createBrand();
    const creator = await createCreator();

    const submitRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Proposal that will be withdrawn soon by creator.',
        proposedPrice: 2200,
        currency: 'USD',
        deliveryDurationWeeks: 2,
        deliverables: ['Deliverable']
      });

    const proposalId = submitRes.body.data.id;

    const withdrawRes = await request(app)
      .post(`/api/creator/proposals/${proposalId}/withdraw`)
      .set('Cookie', creator.cookie);

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.status).toBe('withdrawn');
  });
});
