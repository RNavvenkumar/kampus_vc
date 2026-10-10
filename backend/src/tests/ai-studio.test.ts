import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';
import { User } from '../models/User';
import { BrandProfile } from '../models/BrandProfile';
import { CreativeBriefDraft } from '../models/CreativeBriefDraft';
import { CampaignBrief } from '../models/CampaignBrief';
import { aiService } from '../services/aiService';
import { MockAIProvider } from '../ai/mockProvider';

let mongoServer: MongoMemoryServer;
const app = createApp();

let brandCookie: string;
let brandUser: any;
let otherBrandCookie: string;
let creatorCookie: string;
let mockProvider: MockAIProvider;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  mockProvider = new MockAIProvider();
  aiService.setProvider(mockProvider);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await BrandProfile.deleteMany({});
  await CreativeBriefDraft.deleteMany({});
  await CampaignBrief.deleteMany({});
  mockProvider.reset();

  // Create brand 1
  const brandRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Cyber Brand Director',
      email: 'brand1@cyberstudio.ai',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'brand'
    });
  brandCookie = brandRes.headers['set-cookie'][0];
  brandUser = brandRes.body.data.user;

  await BrandProfile.findOneAndUpdate(
    { userId: brandUser.id },
    {
      companyName: 'Cyberdyne Creative',
      companySlug: 'cyberdyne-creative',
      contactName: 'Cyber Director',
      tagline: 'Future-ready digital marketing',
      website: 'https://cyberdyne.example.com',
      industry: 'Technology',
      isVerified: true
    }
  );

  // Create brand 2 (for authorization tests)
  const brand2Res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Other Brand Lead',
      email: 'brand2@othercompany.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'brand'
    });
  otherBrandCookie = brand2Res.headers['set-cookie'][0];

  // Create creator (for role enforcement tests)
  const creatorRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Neo VFX Artist',
      email: 'creator@vfx.ai',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'creator'
    });
  creatorCookie = creatorRes.headers['set-cookie'][0];
});

describe('Phase 5 — AI Creative Studio & Brief Generation Tests', () => {
  it('GET /api/brand/ai/status returns provider configuration status', async () => {
    const res = await request(app)
      .get('/api/brand/ai/status')
      .set('Cookie', brandCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isConfigured).toBe(true);
    expect(res.body.data.provider).toBe('mock');
    expect(res.body.data.dailyLimit).toBeGreaterThan(0);
  });

  it('enforces brand role on AI endpoints (creators cannot invoke brand AI)', async () => {
    const res = await request(app)
      .post('/api/brand/ai/generate-brief')
      .set('Cookie', creatorCookie)
      .send({
        userPrompt: 'We need high impact 3D visuals for our energy drink launch.'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects unauthenticated requests to AI endpoints', async () => {
    const res = await request(app)
      .post('/api/brand/ai/generate-brief')
      .send({
        userPrompt: 'We need high impact 3D visuals for our energy drink launch.'
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/brand/ai/generate-brief returns validated structured brief', async () => {
    const res = await request(app)
      .post('/api/brand/ai/generate-brief')
      .set('Cookie', brandCookie)
      .send({
        userPrompt: 'Launch a campaign for an electric sports coupe targeting tech enthusiasts.',
        category: '3D Motion Design',
        knownBudgetMin: 3000,
        knownBudgetMax: 7500,
        currency: 'USD',
        timelineWeeks: 4
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.objective).toBeDefined();
    expect(res.body.data.targetAudience).toBeDefined();
    expect(res.body.data.coreMessage).toBeDefined();
    expect(res.body.data.creativeApproach).toBeDefined();
    expect(Array.isArray(res.body.data.deliverables)).toBe(true);
    expect(res.body.data.deliverables.length).toBeGreaterThan(0);
    expect(res.body.data.deliverables[0].name).toBeDefined();
    expect(res.body.data.deliverables[0].quantity).toBeGreaterThanOrEqual(1);
    expect(res.body.usage).toBeDefined();
  });

  it('POST /api/brand/ai/generate-directions returns distinct directions with valid hex palettes', async () => {
    const res = await request(app)
      .post('/api/brand/ai/generate-directions')
      .set('Cookie', brandCookie)
      .send({
        briefTitle: 'Electric Coupe Kinetic Campaign',
        objective: 'Position vehicle as the ultimate performance EV.',
        targetAudience: 'Automotive and design enthusiasts',
        count: 2
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const firstDirection = res.body.data[0];
    expect(firstDirection.directionName).toBeDefined();
    expect(firstDirection.visualStyle).toBeDefined();
    expect(firstDirection.colorPalette.length).toBeGreaterThanOrEqual(2);
    // Verify hex color code validity
    for (const color of firstDirection.colorPalette) {
      expect(color.hex).toMatch(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
    }
  });

  it('POST /api/brand/ai/analyze-moodboard validates URLs and blocks SSRF attempts', async () => {
    // 1. Rejects localhost / private IPs
    const ssrfRes = await request(app)
      .post('/api/brand/ai/analyze-moodboard')
      .set('Cookie', brandCookie)
      .send({
        imageUrls: ['https://169.254.169.254/latest/meta-data/']
      });

    expect(ssrfRes.status).toBe(400);
    expect(ssrfRes.body.error.code).toBe('SSRF_SECURITY_VIOLATION');

    // 2. Rejects non-HTTPS schemes
    const httpRes = await request(app)
      .post('/api/brand/ai/analyze-moodboard')
      .set('Cookie', brandCookie)
      .send({
        imageUrls: ['http://example.com/moodboard1.jpg']
      });

    expect(httpRes.status).toBe(400);
    expect(httpRes.body.error.code).toBe('SSRF_SECURITY_VIOLATION');

    // 3. Accepts valid public HTTPS URLs and returns visual insights
    const validRes = await request(app)
      .post('/api/brand/ai/analyze-moodboard')
      .set('Cookie', brandCookie)
      .send({
        imageUrls: [
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675'
        ],
        contextNotes: 'Cyberpunk neon aesthetics'
      });

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body.data.dominantColors.length).toBeGreaterThan(0);
    expect(validRes.body.data.lightingCharacteristics).toBeDefined();
    expect(validRes.body.data.visualTone).toBeDefined();
  });

  it('POST /api/brand/ai/synthesize-requirements outputs structured deliverables and milestone suggestions', async () => {
    const res = await request(app)
      .post('/api/brand/ai/synthesize-requirements')
      .set('Cookie', brandCookie)
      .send({
        briefTitle: 'Hero EV Commercial',
        summary: '30-second 3D animation and vertical cuts',
        deliverableHints: ['4K commercial', 'Social cutdowns', '3D asset files']
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deliverables.length).toBeGreaterThan(0);
    expect(res.body.data.deliverables[0].format).toBeDefined();
    expect(res.body.data.suggestedMilestones.length).toBeGreaterThan(0);
  });

  it('POST /api/brand/ai/improve-draft provides side-by-side suggestion and consistency check', async () => {
    const res = await request(app)
      .post('/api/brand/ai/improve-draft')
      .set('Cookie', brandCookie)
      .send({
        fieldName: 'summary',
        currentContent: 'We need some 3D stuff made for our new car release.',
        improvementGoal: 'rewrite_professionally'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.suggestedImprovement).toBeDefined();
    expect(res.body.data.rationale).toBeDefined();
    expect(res.body.data.consistencyCheck.isConsistent).toBe(true);
  });
});

describe('Phase 5 — Persistent Creative Drafts & Campaign Conversion', () => {
  const sampleDraftPayload = {
    title: 'Neon Odyssey 3D Campaign',
    userPrompt: 'Create a luminous 3D journey through a cybernetic metropolis.',
    promptContext: {
      category: '3D Animation',
      knownBudgetMin: 3500,
      knownBudgetMax: 8000,
      currency: 'USD',
      timelineWeeks: 4
    },
    structuredBrief: {
      schemaVersion: '1.0',
      title: 'Neon Odyssey 3D Campaign',
      summary: 'A luminous 3D journey through a cybernetic metropolis.',
      objective: 'Showcase brand high-tech aesthetics.',
      targetAudience: 'Digital creators and enthusiasts.',
      coreMessage: 'Beyond the horizon of digital art.',
      creativeApproach: 'Kinetic 3D worldbuilding with volumetric lighting.',
      requiredSpecialties: ['3D Animation', 'Motion Graphics'],
      suggestedTools: ['Blender', 'Cinema 4D'],
      deliverables: [
        {
          name: 'Hero 3D Brand Anthem',
          quantity: 1,
          format: '4K ProRes',
          requiredElements: ['3D Logo Sting'],
          acceptanceCriteria: ['4K resolution']
        }
      ],
      acceptanceCriteria: ['Full commercial rights'],
      constraints: ['Must follow brand color guide'],
      exclusions: ['No stock templates']
    },
    creativeDirections: [
      {
        directionName: 'Kinetic Cyberpunk',
        creativeConcept: 'High-energy neon futuristic visuals.',
        moodAndTone: ['Futuristic', 'High-Energy'],
        visualStyle: 'Cyberpunk',
        colorPalette: [
          { name: 'Cyan', hex: '#58D5FF' },
          { name: 'Magenta', hex: '#E026FE' }
        ],
        lightingAndComposition: 'Harsh rim lights',
        typographyGuidance: 'Monospace',
        motionOrCameraDirection: 'Rapid pans',
        recommendedDeliverables: ['Hero 3D Anthem'],
        strengthsAndTradeoffs: {
          strengths: ['High visual impact'],
          tradeoffs: ['Render intensive']
        },
        productionConsiderations: ['Use GPU rendering']
      }
    ],
    selectedDirectionIndex: 0,
    moodboardReferences: [
      { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', caption: 'Cyber styling' }
    ]
  };

  it('persists a complete creative draft in MongoDB and allows retrieval', async () => {
    const createRes = await request(app)
      .post('/api/brand/creative-drafts')
      .set('Cookie', brandCookie)
      .send(sampleDraftPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toBeDefined();
    const createdDraftId = createRes.body.data.id;

    // Verify retrieval
    const getRes = await request(app)
      .get(`/api/brand/creative-drafts/${createdDraftId}`)
      .set('Cookie', brandCookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.title).toBe('Neon Odyssey 3D Campaign');
    expect(getRes.body.data.version).toBe(1);

    // Verify other brand cannot access this draft
    const unauthorizedRes = await request(app)
      .get(`/api/brand/creative-drafts/${createdDraftId}`)
      .set('Cookie', otherBrandCookie);

    expect(unauthorizedRes.status).toBe(404);
  });

  it('updates draft fields and increments version counter', async () => {
    const createRes = await request(app)
      .post('/api/brand/creative-drafts')
      .set('Cookie', brandCookie)
      .send(sampleDraftPayload);
    const draftId = createRes.body.data.id;

    const updateRes = await request(app)
      .patch(`/api/brand/creative-drafts/${draftId}`)
      .set('Cookie', brandCookie)
      .send({
        title: 'Neon Odyssey 3D Campaign (Final Director Cut)',
        selectedDirectionIndex: 0
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Neon Odyssey 3D Campaign (Final Director Cut)');
    expect(updateRes.body.data.version).toBe(2);
  });

  it('POST /api/brand/creative-drafts/:draftId/create-brief converts approved draft into unpublished CampaignBrief', async () => {
    const createRes = await request(app)
      .post('/api/brand/creative-drafts')
      .set('Cookie', brandCookie)
      .send(sampleDraftPayload);
    const draftId = createRes.body.data.id;

    const convertRes = await request(app)
      .post(`/api/brand/creative-drafts/${draftId}/create-brief`)
      .set('Cookie', brandCookie);

    expect(convertRes.status).toBe(201);
    expect(convertRes.body.success).toBe(true);
    expect(convertRes.body.data.campaignBriefId).toBeDefined();
    expect(convertRes.body.data.status).toBe('draft'); // Stays draft until brand publishes it!

    // Verify campaign brief document in database
    const briefDoc = await CampaignBrief.findById(convertRes.body.data.campaignBriefId);
    expect(briefDoc).not.toBeNull();
    expect(briefDoc?.title).toContain('Neon Odyssey');
    expect(briefDoc?.companyName).toBe('Cyberdyne Creative');
    expect(briefDoc?.status).toBe('draft');
    expect(briefDoc?.deliverables.length).toBeGreaterThan(0);
    expect(briefDoc?.referenceUrls.length).toBeGreaterThan(0);

    // Verify link back to draft
    const updatedDraft = await CreativeBriefDraft.findById(draftId);
    expect(updatedDraft?.campaignBriefId?.toString()).toBe(briefDoc?.id);
  });

  it('handles provider outages gracefully without claiming fake success', async () => {
    mockProvider.setMockFailure(true, 'Google Gemini API is currently experiencing service disruption (503)');

    const res = await request(app)
      .post('/api/brand/ai/generate-brief')
      .set('Cookie', brandCookie)
      .send({
        userPrompt: 'This generation should fail cleanly when the provider fails.'
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Google Gemini API is currently experiencing service disruption');
  });

  it('handles provider timeouts gracefully', async () => {
    mockProvider.setMockTimeout(true);

    const res = await request(app)
      .post('/api/brand/ai/generate-brief')
      .set('Cookie', brandCookie)
      .send({
        userPrompt: 'This generation should time out cleanly.'
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('AI_TIMEOUT');
  });
});
