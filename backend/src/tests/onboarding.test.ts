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

describe('Creator & Brand Multi-Step Onboarding Tests', () => {
  it('Creator multi-step onboarding saves step progress and completes successfully', async () => {
    // 1. Register creator
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane@creator.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });

    const cookie = regRes.headers['set-cookie'];

    // 2. Save Step 1: Basic identity
    const step1Res = await request(app)
      .post('/api/creator/onboarding/step')
      .set('Cookie', cookie)
      .send({
        step: 1,
        data: {
          displayName: 'Jane Doe AI',
          username: 'janedoe_ai',
          headline: 'Generative AI Director & 3D Artist'
        }
      });

    expect(step1Res.status).toBe(200);
    expect(step1Res.body.data.profile.displayName).toBe('Jane Doe AI');
    expect(step1Res.body.data.onboardingStep).toBe(2);

    // 3. Save Step 2: Creative identity
    const step2Res = await request(app)
      .post('/api/creator/onboarding/step')
      .set('Cookie', cookie)
      .send({
        step: 2,
        data: {
          biography: 'Creating world-class procedural art and AI visual campaigns.',
          specialties: ['AI Concept Art', '3D Motion'],
          creativeTools: ['Midjourney', 'Cinema 4D', 'Houdini'],
          experienceLevel: 'advanced'
        }
      });

    expect(step2Res.status).toBe(200);
    expect(step2Res.body.data.profile.specialties).toContain('AI Concept Art');

    // 4. Save Step 3: Portfolio item
    const step3Res = await request(app)
      .post('/api/creator/onboarding/step')
      .set('Cookie', cookie)
      .send({
        step: 3,
        data: {
          portfolioItems: [
            {
              title: 'Neon Odyssey',
              description: 'Cyberpunk worldbuilding asset',
              mediaUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
              tags: ['Cyberpunk', 'AI Art']
            }
          ]
        }
      });

    expect(step3Res.status).toBe(200);
    expect(step3Res.body.data.profile.portfolioItems.length).toBe(1);

    // 5. Complete onboarding
    const completeRes = await request(app)
      .post('/api/creator/onboarding/complete')
      .set('Cookie', cookie)
      .send({});

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.user.onboardingStatus).toBe('completed');
    expect(completeRes.body.data.profile.profileCompletion).toBeGreaterThanOrEqual(70);
  });

  it('Brand multi-step onboarding saves step progress and completes successfully', async () => {
    // 1. Register brand
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Apex Studios',
        email: 'contact@apex.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });

    const cookie = regRes.headers['set-cookie'];

    // 2. Save Step 1: Company details
    const step1Res = await request(app)
      .post('/api/brand/onboarding/step')
      .set('Cookie', cookie)
      .send({
        step: 1,
        data: {
          companyName: 'Apex Creative Studios',
          industry: 'Entertainment & Gaming',
          companySize: '11-50'
        }
      });

    expect(step1Res.status).toBe(200);
    expect(step1Res.body.data.profile.companyName).toBe('Apex Creative Studios');

    // 3. Complete onboarding
    const completeRes = await request(app)
      .post('/api/brand/onboarding/complete')
      .set('Cookie', cookie)
      .send({});

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.user.onboardingStatus).toBe('completed');
  });
});
