import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
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
  await BrandProfile.deleteMany({});
});

describe('Phase 3 — Brand Campaign Briefs & Public Discovery Tests', () => {
  async function createBrandSession(name = 'Acme Studios', email = 'acme@example.com') {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    const cookies = res.headers['set-cookie'];
    return { user: res.body.data.user, cookie: cookies[0] };
  }

  async function createCreatorSession() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Elena Vance',
        email: 'elena@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    const cookies = res.headers['set-cookie'];
    return { user: res.body.data.user, cookie: cookies[0] };
  }

  it('orchestrates complete campaign brief lifecycle: draft -> published -> paused -> resumed -> archived -> deleted', async () => {
    const { cookie } = await createBrandSession();

    // 1. Create Draft Brief
    const createRes = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', cookie)
      .send({
        title: 'Cyberpunk Footwear 3D Launch Reel',
        summary: 'Commercial animation for futuristic sneakers.',
        description: 'Detailed narrative description of the cyber-aesthetic commercial campaign involving high-end particle effects.',
        category: '3D Motion & Product Visuals',
        requiredSpecialties: ['Cinema 4D / Redshift', 'Houdini VFX'],
        deliverables: ['1x 60s 4K Video Master', '3x 9:16 Social Cutdowns'],
        budgetType: 'range',
        budgetMin: 3000,
        budgetMax: 7000,
        currency: 'USD',
        durationWeeks: 4
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data).toHaveProperty('id');
    expect(createRes.body.data.status).toBe('draft');
    expect(createRes.body.data.title).toBe('Cyberpunk Footwear 3D Launch Reel');

    const briefId = createRes.body.data.id;

    // 2. Fetch My Briefs (list & stats)
    const listRes = await request(app)
      .get('/api/brand/briefs')
      .set('Cookie', cookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.briefs.length).toBe(1);
    expect(listRes.body.data.stats.draft).toBe(1);
    expect(listRes.body.data.stats.published).toBe(0);

    // 3. Publish Brief
    const publishRes = await request(app)
      .post(`/api/brand/briefs/${briefId}/publish`)
      .set('Cookie', cookie);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe('published');
    expect(publishRes.body.data).toHaveProperty('publishedAt');

    // 4. Verify Brief appears in Public Discovery
    const publicDiscoveryRes = await request(app).get('/api/briefs');
    expect(publicDiscoveryRes.status).toBe(200);
    expect(publicDiscoveryRes.body.data.briefs.length).toBe(1);
    expect(publicDiscoveryRes.body.data.briefs[0].title).toBe('Cyberpunk Footwear 3D Launch Reel');

    // 5. Pause Brief
    const pauseRes = await request(app)
      .post(`/api/brand/briefs/${briefId}/pause`)
      .set('Cookie', cookie);

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.data.status).toBe('paused');

    // 6. Verify Paused Brief is hidden from Public Discovery
    const publicPostPauseRes = await request(app).get('/api/briefs');
    expect(publicPostPauseRes.status).toBe(200);
    expect(publicPostPauseRes.body.data.briefs.length).toBe(0);

    // 7. Resume Brief
    const resumeRes = await request(app)
      .post(`/api/brand/briefs/${briefId}/resume`)
      .set('Cookie', cookie);

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.status).toBe('published');

    // 8. Archive Brief
    const archiveRes = await request(app)
      .post(`/api/brand/briefs/${briefId}/archive`)
      .set('Cookie', cookie);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.status).toBe('archived');

    // 9. Delete Brief
    const deleteRes = await request(app)
      .delete(`/api/brand/briefs/${briefId}`)
      .set('Cookie', cookie);

    expect(deleteRes.status).toBe(200);
  });

  it('prevents creator accounts from authoring brand briefs', async () => {
    const { cookie } = await createCreatorSession();

    const res = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', cookie)
      .send({
        title: 'Unauthorized Brief',
        category: 'Commercial'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents a brand from editing another brand brief', async () => {
    const brand1 = await createBrandSession('Brand One', 'brand1@example.com');
    const brand2 = await createBrandSession('Brand Two', 'brand2@example.com');

    // Brand 1 creates brief
    const createRes = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', brand1.cookie)
      .send({
        title: 'Brand 1 Exclusive Campaign',
        deliverables: ['Deliverable 1']
      });

    const briefId = createRes.body.data.id;

    // Brand 2 attempts to update Brand 1's brief
    const unauthorizedUpdateRes = await request(app)
      .patch(`/api/brand/briefs/${briefId}`)
      .set('Cookie', brand2.cookie)
      .send({
        title: 'Hijacked Title'
      });

    expect(unauthorizedUpdateRes.status).toBe(404);
  });
});
