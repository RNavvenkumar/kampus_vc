import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
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

// Mock OAuth2Client
vi.mock('google-auth-library', () => {
  const MockOAuth2Client = vi.fn().mockImplementation(() => ({
    verifyIdToken: vi.fn().mockImplementation(async ({ idToken }) => {
      if (idToken === 'valid-google-token') {
        return {
          getPayload: () => ({
            sub: 'google-sub-123456789',
            email: 'googlecreator@example.com',
            email_verified: true,
            name: 'Google Creator User',
            picture: 'https://lh3.googleusercontent.com/a/avatar123'
          })
        };
      }
      if (idToken === 'valid-brand-token') {
        return {
          getPayload: () => ({
            sub: 'google-sub-987654321',
            email: 'branddirector@company.com',
            email_verified: true,
            name: 'Brand Director',
            picture: 'https://lh3.googleusercontent.com/a/brandavatar'
          })
        };
      }
      if (idToken === 'unverified-email-token') {
        return {
          getPayload: () => ({
            sub: 'google-sub-unverified',
            email: 'unverified@example.com',
            email_verified: false,
            name: 'Unverified User'
          })
        };
      }
      if (idToken === 'expired-token' || idToken === 'forged-token') {
        throw new Error('Invalid token signature or expired');
      }
      throw new Error('Token verification failed');
    })
  }));
  return { OAuth2Client: MockOAuth2Client };
});

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

describe('Google OAuth 2.0 / Google Sign-In Authentication Tests', () => {
  it('rejects unconfigured or missing Google credential payload', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(400);
  });

  it('rejects forged or expired Google credential tokens', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'forged-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('rejects Google accounts with unverified email addresses', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'unverified-email-token' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNVERIFIED_EMAIL');
  });

  it('successfully creates a new Creator account from a valid Google credential', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'valid-google-token',
        role: 'creator'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('googlecreator@example.com');
    expect(res.body.data.user.role).toBe('creator');
    expect(res.body.data.user.avatarUrl).toBe('https://lh3.googleusercontent.com/a/avatar123');
    expect(res.body.data.sessionToken).toBeDefined();

    // Verify creator profile was created
    const profile = await CreatorProfile.findOne({ userId: res.body.data.user.id });
    expect(profile).toBeDefined();
    expect(profile?.displayName).toBe('Google Creator User');

    // Verify User record in database has googleId
    const userInDb = await User.findById(res.body.data.user.id);
    expect(userInDb?.googleId).toBe('google-sub-123456789');
    expect(userInDb?.emailVerified).toBe(true);
  });

  it('successfully creates a new Brand account from a valid Google credential', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'valid-brand-token',
        role: 'brand'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('branddirector@company.com');
    expect(res.body.data.user.role).toBe('brand');

    const brandProfile = await BrandProfile.findOne({ userId: res.body.data.user.id });
    expect(brandProfile).toBeDefined();
    expect(brandProfile?.companyName).toBe('Brand Director');
  });

  it('safely links existing email/password account when logging in with verified Google email', async () => {
    // Create pre-existing user with email/password
    const existingUser = await User.create({
      name: 'Pre Existing Creator',
      email: 'googlecreator@example.com',
      passwordHash: 'hashed_pw_test',
      role: 'creator',
      accountStatus: 'active',
      emailVerified: false,
      onboardingStatus: 'completed',
      onboardingStep: 3
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({
        credential: 'valid-google-token'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(existingUser._id.toString());

    // Verify googleId is linked and email is verified
    const updatedUser = await User.findById(existingUser._id);
    expect(updatedUser?.googleId).toBe('google-sub-123456789');
    expect(updatedUser?.emailVerified).toBe(true);
  });

  it('subsequent Google sign-ins for existing googleId authenticate directly', async () => {
    // 1st login creates user
    await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });

    // 2nd login finds by googleId
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('googlecreator@example.com');
  });

  it('blocks suspended accounts attempting Google Sign-In with 403', async () => {
    await User.create({
      name: 'Suspended User',
      email: 'googlecreator@example.com',
      googleId: 'google-sub-123456789',
      role: 'creator',
      accountStatus: 'suspended',
      emailVerified: true
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});
