import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { CreatorProfile } from '../models/CreatorProfile.js';

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
});

describe('Phase 3 — Creator Service Catalog & Availability Tests', () => {
  async function createCreatorSession() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Elena Vance',
        email: 'elena.service@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    const cookies = res.headers['set-cookie'];
    return { user: res.body.data.user, cookie: cookies[0] };
  }

  it('allows creator to create, update, toggle status, and delete a service package', async () => {
    const { cookie } = await createCreatorSession();

    // 1. Create Service Package
    const createRes = await request(app)
      .post('/api/creator/services')
      .set('Cookie', cookie)
      .send({
        title: 'Cinematic Concept Keyframe Pack',
        category: 'Concept Art',
        deliverables: ['4x 4K Master Renders', 'PSD Working File'],
        revisions: 2,
        price: 1200,
        currency: 'USD',
        turnaroundDays: 5,
        packageTier: 'standard',
        status: 'active'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data).toHaveProperty('id');
    expect(createRes.body.data.title).toBe('Cinematic Concept Keyframe Pack');
    expect(createRes.body.data.price).toBe(1200);

    const serviceId = createRes.body.data.id;

    // 2. Fetch My Services
    const getRes = await request(app)
      .get('/api/creator/services')
      .set('Cookie', cookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.services.length).toBe(1);

    // 3. Update Service
    const updateRes = await request(app)
      .patch(`/api/creator/services/${serviceId}`)
      .set('Cookie', cookie)
      .send({
        price: 1500,
        turnaroundDays: 4
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.price).toBe(1500);
    expect(updateRes.body.data.turnaroundDays).toBe(4);

    // 4. Toggle Status (active -> inactive)
    const toggleRes = await request(app)
      .patch(`/api/creator/services/${serviceId}/status`)
      .set('Cookie', cookie);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.status).toBe('inactive');

    // 5. Delete Service
    const deleteRes = await request(app)
      .delete(`/api/creator/services/${serviceId}`)
      .set('Cookie', cookie);

    expect(deleteRes.status).toBe(200);

    const postDeleteRes = await request(app)
      .get('/api/creator/services')
      .set('Cookie', cookie);
    expect(postDeleteRes.body.data.services.length).toBe(0);
  });

  it('rejects invalid service price or turnaround time', async () => {
    const { cookie } = await createCreatorSession();

    const badPriceRes = await request(app)
      .post('/api/creator/services')
      .set('Cookie', cookie)
      .send({
        title: 'Cheap Service',
        deliverables: ['Something'],
        price: 2, // min is $5
        turnaroundDays: 3
      });

    expect(badPriceRes.status).toBe(400);

    const badTurnaroundRes = await request(app)
      .post('/api/creator/services')
      .set('Cookie', cookie)
      .send({
        title: 'Long Service',
        deliverables: ['Something'],
        price: 50,
        turnaroundDays: 500 // max is 365
      });

    expect(badTurnaroundRes.status).toBe(400);
  });

  it('updates and persists creator availability status and note', async () => {
    const { cookie } = await createCreatorSession();

    const availRes = await request(app)
      .patch('/api/creator/availability')
      .set('Cookie', cookie)
      .send({
        availability: 'limited',
        availabilityNote: 'Taking 2 commercial projects in Q4',
        availableFromDate: '2026-11-01'
      });

    expect(availRes.status).toBe(200);
    expect(availRes.body.data.availability).toBe('limited');
    expect(availRes.body.data.availabilityNote).toBe('Taking 2 commercial projects in Q4');

    const getAvailRes = await request(app)
      .get('/api/creator/availability')
      .set('Cookie', cookie);

    expect(getAvailRes.status).toBe(200);
    expect(getAvailRes.body.data.availability).toBe('limited');
  });
});
