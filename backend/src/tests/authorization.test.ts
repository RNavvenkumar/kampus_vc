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

describe('Role-Based Authorization & Isolation Tests', () => {
  it('Unauthenticated requests to protected endpoints receive 401', async () => {
    const resCreator = await request(app).get('/api/creator/profile/me');
    expect(resCreator.status).toBe(401);
    expect(resCreator.body.error.code).toBe('UNAUTHORIZED');

    const resBrand = await request(app).get('/api/brand/profile/me');
    expect(resBrand.status).toBe(401);
    expect(resBrand.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Creator account is forbidden (403) from accessing Brand-only endpoints', async () => {
    // 1. Register as creator
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Creator User',
        email: 'creator@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });

    const cookie = regRes.headers['set-cookie'];

    // 2. Attempt to access brand endpoint
    const brandAccess = await request(app)
      .get('/api/brand/profile/me')
      .set('Cookie', cookie);

    expect(brandAccess.status).toBe(403);
    expect(brandAccess.body.error.code).toBe('FORBIDDEN');
  });

  it('Brand account is forbidden (403) from accessing Creator-only endpoints', async () => {
    // 1. Register as brand
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Brand Co',
        email: 'brand@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });

    const cookie = regRes.headers['set-cookie'];

    // 2. Attempt to access creator endpoint
    const creatorAccess = await request(app)
      .get('/api/creator/profile/me')
      .set('Cookie', cookie);

    expect(creatorAccess.status).toBe(403);
    expect(creatorAccess.body.error.code).toBe('FORBIDDEN');
  });
});
