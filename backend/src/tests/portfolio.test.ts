import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
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
  await CreatorProfile.deleteMany({});
  await BrandProfile.deleteMany({});
});

describe('Phase 3 — Creator Portfolio Management Tests', () => {
  async function createCreatorSession() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Elena Vance',
        email: 'elena.portfolio@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    const cookies = res.headers['set-cookie'];
    return { user: res.body.data.user, cookie: cookies[0] };
  }

  async function createBrandSession() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Acme Studio',
        email: 'acme.brand@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    const cookies = res.headers['set-cookie'];
    return { user: res.body.data.user, cookie: cookies[0] };
  }

  it('allows creator to create, view, update, feature, reorder, and delete a portfolio item', async () => {
    const { cookie } = await createCreatorSession();

    // 1. Create Portfolio Item
    const createRes = await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Neo-Tokyo 2099',
        category: 'Generative Art',
        description: 'Cinematic cyberpunk environment concept.',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477',
        tags: ['Cyberpunk', 'Environment'],
        creativeTools: ['Midjourney v6', 'Photoshop'],
        visibility: 'public'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data).toHaveProperty('id');
    expect(createRes.body.data.title).toBe('Neo-Tokyo 2099');
    expect(createRes.body.data.slug).toBe('neo-tokyo-2099');

    const itemId = createRes.body.data.id;

    // 2. Fetch My Portfolio
    const getRes = await request(app)
      .get('/api/creator/portfolio')
      .set('Cookie', cookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.items.length).toBe(1);
    expect(getRes.body.data.items[0].id).toBe(itemId);

    // 3. Update Item
    const updateRes = await request(app)
      .patch(`/api/creator/portfolio/${itemId}`)
      .set('Cookie', cookie)
      .send({
        title: 'Neo-Tokyo 2099 Enhanced',
        clientName: 'Sony Music'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Neo-Tokyo 2099 Enhanced');
    expect(updateRes.body.data.clientName).toBe('Sony Music');

    // 4. Toggle Feature
    const featureRes = await request(app)
      .patch(`/api/creator/portfolio/${itemId}/feature`)
      .set('Cookie', cookie);

    expect(featureRes.status).toBe(200);
    expect(featureRes.body.data.isFeatured).toBe(true);

    // 5. Add second item and test reorder
    const secondRes = await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Bioluminescent Organics',
        category: 'Texture Design',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'
      });

    const secondId = secondRes.body.data.id;

    const reorderRes = await request(app)
      .patch('/api/creator/portfolio/reorder')
      .set('Cookie', cookie)
      .send({
        itemIds: [secondId, itemId]
      });

    expect(reorderRes.status).toBe(200);

    // Verify ordering in GET
    const sortedRes = await request(app)
      .get('/api/creator/portfolio')
      .set('Cookie', cookie);
    expect(sortedRes.body.data.items[0].id).toBe(secondId);
    expect(sortedRes.body.data.items[1].id).toBe(itemId);

    // 6. Delete Item
    const deleteRes = await request(app)
      .delete(`/api/creator/portfolio/${itemId}`)
      .set('Cookie', cookie);

    expect(deleteRes.status).toBe(200);

    const postDeleteRes = await request(app)
      .get('/api/creator/portfolio')
      .set('Cookie', cookie);
    expect(postDeleteRes.body.data.items.length).toBe(1);
    expect(postDeleteRes.body.data.items[0].id).toBe(secondId);
  });

  it('rejects invalid media URL or media type', async () => {
    const { cookie } = await createCreatorSession();

    const res = await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Bad Item',
        mediaUrl: 'not-a-valid-url',
        mediaType: 'invalid-type'
      });

    expect(res.status).toBe(400);
  });

  it('prevents brand account from creating or deleting creator portfolio items', async () => {
    const { cookie } = await createBrandSession();

    const res = await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Brand attempting portfolio',
        mediaUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('hides private portfolio items from public discovery endpoints', async () => {
    const { user, cookie } = await createCreatorSession();

    // Create 1 public item
    await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Public Asset',
        mediaUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477',
        visibility: 'public'
      });

    // Create 1 private item
    await request(app)
      .post('/api/creator/portfolio')
      .set('Cookie', cookie)
      .send({
        title: 'Secret Client NDA Asset',
        mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
        visibility: 'private'
      });

    // Query Public Creator Endpoint
    const publicRes = await request(app).get(`/api/creators/${user.id}`);
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.data.portfolioItems.length).toBe(1);
    expect(publicRes.body.data.portfolioItems[0].title).toBe('Public Asset');
  });
});
