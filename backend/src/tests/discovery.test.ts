import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { CreatorProfile } from '../models/CreatorProfile.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

describe('Phase 6 — Intelligent Creator Discovery & Advanced Search Tests', () => {
  let creator1UserId: string;
  let creator2UserId: string;
  let creator3UserId: string;
  let suspendedCreatorUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    // Create Creator 1 (3D / Motion Designer - Active, Public, High completion)
    const u1 = await User.create({
      name: 'Maya Lin',
      email: 'maya@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'active',
      onboardingStatus: 'completed',
      onboardingStep: 5
    });
    creator1UserId = u1._id.toString();

    await CreatorProfile.create({
      userId: u1._id,
      displayName: 'Maya Lin',
      username: 'mayalin_3d',
      headline: 'Senior 3D Motion Designer & Cyberpunk Art Director',
      biography: 'Specializing in cinematic 3D animation, volumetric lighting, and futuristic motion design with Unreal Engine and Blender.',
      specialties: ['3D Animation & Motion', 'Motion Graphics & VFX', 'Sci-Fi Worldbuilding'],
      creativeTools: ['Blender', 'Unreal Engine', 'Cinema 4D', 'After Effects'],
      experienceLevel: 'expert',
      hourlyRate: 95,
      currency: 'USD',
      availability: 'available',
      profileVisibility: 'public',
      profileCompletion: 95,
      portfolioItems: [
        {
          id: 'port_1_pub',
          title: 'Cyberpunk Hypercar Commercial',
          description: 'Kinetic 3D automotive commercial rendered in Unreal Engine 5 with octane shaders',
          category: '3D Animation & Motion',
          tags: ['Unreal Engine', 'Octane', 'Cyberpunk', 'Automotive', '3D Animation'],
          creativeTools: ['Unreal Engine', 'Blender'],
          mediaType: 'video',
          mediaUrl: 'https://cdn.example.com/videos/hypercar.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
          isFeatured: true,
          displayOrder: 0,
          visibility: 'public',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'port_1_priv',
          title: 'Confidential Client Unreleased Product',
          description: 'Private unreleased client renders with NDA protection',
          category: '3D Animation & Motion',
          tags: ['Secret', 'NDA'],
          creativeTools: ['Blender'],
          mediaType: 'image',
          mediaUrl: 'https://cdn.example.com/private/render.jpg',
          isFeatured: false,
          displayOrder: 1,
          visibility: 'private',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      services: [
        {
          id: 'srv_1_pub',
          title: '3D Kinetic Product Teaser',
          description: 'A 15-second high-impact 3D product motion render with sound design',
          category: '3D Animation & Motion',
          deliverables: ['4K MP4 Master', 'Source Project Files'],
          revisions: 2,
          price: 3500,
          currency: 'USD',
          turnaroundDays: 14,
          packageTier: 'standard',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'srv_1_inact',
          title: 'Draft Inactive Service',
          description: 'Not currently offering this package',
          category: '3D Animation & Motion',
          deliverables: ['Draft'],
          revisions: 1,
          price: 500,
          currency: 'USD',
          turnaroundDays: 3,
          packageTier: 'starter',
          status: 'inactive',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // Create Creator 2 (AI Concept Artist - Active, Public, EUR Currency)
    const u2 = await User.create({
      name: 'Julian Vance',
      email: 'julian@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'active',
      onboardingStatus: 'completed',
      onboardingStep: 5
    });
    creator2UserId = u2._id.toString();

    await CreatorProfile.create({
      userId: u2._id,
      displayName: 'Julian Vance',
      username: 'julianv_ai',
      headline: 'AI Art & Concept Director for Luxury & Fashion',
      biography: 'Editorial AI art direction, Midjourney prompt architecture, and luxury skincare campaigns.',
      specialties: ['AI Art & Concept Direction', 'Brand Identity & Design'],
      creativeTools: ['Midjourney', 'Stable Diffusion', 'Photoshop', 'Runway Gen-2'],
      experienceLevel: 'advanced',
      hourlyRate: 75,
      currency: 'EUR',
      availability: 'limited',
      profileVisibility: 'public',
      profileCompletion: 80,
      portfolioItems: [
        {
          id: 'port_2_pub',
          title: 'Botanical Luxury Skincare Visuals',
          description: 'Editorial luxury beauty imagery generated with custom LoRA fine-tuning and digital repainting',
          category: 'AI Art & Concept Direction',
          tags: ['Luxury', 'Skincare', 'Midjourney', 'Editorial', 'AI Art'],
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
          id: 'srv_2_pub',
          title: 'Luxury Editorial Campaign Key Visuals',
          description: 'Set of 6 high-resolution hero campaign visuals with commercial license',
          category: 'AI Art & Concept Direction',
          deliverables: ['6x 8K Master TIFFs', 'Style Guide PDF'],
          revisions: 3,
          price: 2200,
          currency: 'EUR',
          turnaroundDays: 7,
          packageTier: 'standard',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // Create Creator 3 (Private Profile Creator - should be excluded from public search)
    const u3 = await User.create({
      name: 'Private Creator',
      email: 'private@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'active',
      onboardingStatus: 'completed',
      onboardingStep: 5
    });
    creator3UserId = u3._id.toString();

    await CreatorProfile.create({
      userId: u3._id,
      displayName: 'Stealth Creator',
      username: 'stealth_creator',
      headline: 'Stealth mode creator',
      specialties: ['3D Animation & Motion'],
      creativeTools: ['Blender'],
      profileVisibility: 'private',
      profileCompletion: 70
    });

    // Create Creator 4 (Suspended user account - should be excluded from search)
    const u4 = await User.create({
      name: 'Banned Bad Actor',
      email: 'banned@creators.test',
      passwordHash: 'hash123',
      role: 'creator',
      accountStatus: 'suspended',
      onboardingStatus: 'completed',
      onboardingStep: 5
    });
    suspendedCreatorUserId = u4._id.toString();

    await CreatorProfile.create({
      userId: u4._id,
      displayName: 'Banned Creator',
      username: 'banned_creator',
      headline: 'Suspended account',
      specialties: ['3D Animation & Motion'],
      creativeTools: ['Blender'],
      profileVisibility: 'public',
      profileCompletion: 80
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('GET /api/creators/search returns all active public creators with pagination', async () => {
    const res = await request(app).get('/api/creators/search');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.creators).toBeInstanceOf(Array);
    expect(res.body.data.creators.length).toBe(2); // Maya Lin and Julian Vance (Stealth & Suspended excluded)
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('filters creators by text query across name, tools, and portfolio tags', async () => {
    const res = await request(app).get('/api/creators/search?q=Cyberpunk');

    expect(res.status).toBe(200);
    expect(res.body.data.creators.length).toBe(1);
    expect(res.body.data.creators[0].displayName).toBe('Maya Lin');
  });

  it('filters creators by creative tool (e.g. Midjourney)', async () => {
    const res = await request(app).get('/api/creators/search?creativeTools=Midjourney');

    expect(res.status).toBe(200);
    expect(res.body.data.creators.length).toBe(1);
    expect(res.body.data.creators[0].displayName).toBe('Julian Vance');
  });

  it('filters creators by category / specialty', async () => {
    const res = await request(app).get('/api/creators/search?category=AI Art & Concept Direction');

    expect(res.status).toBe(200);
    expect(res.body.data.creators.length).toBe(1);
    expect(res.body.data.creators[0].displayName).toBe('Julian Vance');
  });

  it('filters creators by price range and currency', async () => {
    // Julian Vance has price 2200 EUR, Maya Lin has price 3500 USD
    const resUsd = await request(app).get('/api/creators/search?currency=USD&minPrice=3000&maxPrice=5000');

    expect(resUsd.status).toBe(200);
    expect(resUsd.body.data.creators.length).toBe(1);
    expect(resUsd.body.data.creators[0].displayName).toBe('Maya Lin');
  });

  it('strictly suppresses private portfolio items and inactive services from search response', async () => {
    const res = await request(app).get('/api/creators/search?q=Maya');

    expect(res.status).toBe(200);
    const creator = res.body.data.creators[0];
    expect(creator.displayName).toBe('Maya Lin');

    // Portfolio items check
    expect(creator.portfolioItems.length).toBe(1);
    expect(creator.portfolioItems[0].title).toBe('Cyberpunk Hypercar Commercial');
    const hasPrivateItem = creator.portfolioItems.some((i: any) => i.title.includes('Confidential Client'));
    expect(hasPrivateItem).toBe(false);

    // Services check
    expect(creator.services.length).toBe(1);
    expect(creator.services[0].title).toBe('3D Kinetic Product Teaser');
    const hasInactiveService = creator.services.some((s: any) => s.title.includes('Inactive'));
    expect(hasInactiveService).toBe(false);
  });

  it('never leaks user emails, password hashes, or internal database secrets', async () => {
    const res = await request(app).get('/api/creators/search');

    expect(res.status).toBe(200);
    for (const c of res.body.data.creators) {
      expect(c.email).toBeUndefined();
      expect(c.passwordHash).toBeUndefined();
      expect(c.userId).toBeUndefined();
      expect(c.__v).toBeUndefined();
    }
  });

  it('POST /api/creators/parse-search-intent extracts structured filters from natural text', async () => {
    const res = await request(app)
      .post('/api/creators/parse-search-intent')
      .send({ query: 'Need a senior 3D animation artist skilled in Blender and Unreal Engine under $4000' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.category).toBe('3D Animation & Motion');
    expect(res.body.data.creativeTools).toContain('Blender');
    expect(res.body.data.creativeTools).toContain('Unreal Engine');
    expect(res.body.data.maxPrice).toBe(4000);
    expect(res.body.data.experienceLevel).toBe('advanced');
  });

  it('safely handles malicious regex patterns and empty results gracefully', async () => {
    const res = await request(app).get('/api/creators/search?q=(?i)(?:[a-z]+)*$$$nonexistent12345');

    expect(res.status).toBe(200);
    expect(res.body.data.creators.length).toBe(0);
    expect(res.body.data.pagination.total).toBe(0);
  });
});
