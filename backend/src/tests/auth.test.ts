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

describe('Authentication & Session Tests', () => {
  it('POST /api/auth/register successfully registers a creator and establishes session', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Elena Vance',
        email: 'elena@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user.email).toBe('elena@example.com');
    expect(res.body.data.user.role).toBe('creator');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    // Verify session cookie was set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('kampus_session=');

    // Verify CreatorProfile was created in DB
    const profile = await CreatorProfile.findOne({ userId: res.body.data.user.id });
    expect(profile).toBeDefined();
    expect(profile?.displayName).toBe('Elena Vance');
  });

  it('POST /api/auth/register rejects duplicate email address', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('POST /api/auth/register rejects password mismatch and weak passwords', async () => {
    const resMismatch = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword!',
        role: 'creator'
      });
    expect(resMismatch.status).toBe(400);

    const resWeak = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        role: 'creator'
      });
    expect(resWeak.status).toBe(400);
  });

  it('POST /api/auth/login logs in valid user and GET /api/auth/me returns safe profile', async () => {
    // 1. Register
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Brand User',
        email: 'brand@acme.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'brand@acme.com',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const cookie = loginRes.headers['set-cookie'];

    // 3. Check /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('brand@acme.com');
    expect(meRes.body.data.user.role).toBe('brand');
    expect(meRes.body.data.profile).toBeDefined();
    expect(meRes.body.data.profile.companyName).toBe('Brand User');
  });

  it('POST /api/auth/logout invalidates session and prevents subsequent authorized access', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Logout User',
        email: 'logout@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });

    const cookie = regRes.headers['set-cookie'];

    // Verify authorized
    const meBefore = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meBefore.status).toBe(200);

    // Logout
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(200);

    // Verify session revoked
    const meAfter = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meAfter.status).toBe(401);
  });

  it('POST /api/auth/change-password validates current password and updates hash', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pass Change User',
        email: 'passchange@example.com',
        password: 'OldPassword123!',
        confirmPassword: 'OldPassword123!',
        role: 'creator'
      });

    const cookie = regRes.headers['set-cookie'];

    // Wrong current password
    const wrongRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'WrongPassword!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!'
      });
    expect(wrongRes.status).toBe(401);

    // Correct change
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!'
      });
    expect(changeRes.status).toBe(200);

    // Login with new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'passchange@example.com',
        password: 'NewPassword123!'
      });
    expect(newLoginRes.status).toBe(200);
  });
});
