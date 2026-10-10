import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';

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

describe('Phase 11 — Production Readiness, Security Hardening & Observability Tests', () => {
  it('GET /api/health returns 200 with platform health and correlation requestId', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.platform).toBe('Kampus.VC API Gateway');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.services.database.status).toBe('connected');
    expect(res.body.requestId).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /api/health/ready returns readiness check across database, storage, and payment providers', async () => {
    const res = await request(app).get('/api/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database).toBe('ok');
    expect(res.body.checks.storage).toBe('ok');
    expect(res.body.checks.storageProvider).toBeDefined();
    expect(res.body.checks.payments).toBeDefined();
  });

  it('preserves client-provided X-Request-Id header across pipeline', async () => {
    const customId = 'client-custom-req-id-998877';
    const res = await request(app)
      .get('/api/health')
      .set('x-request-id', customId);

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.requestId).toBe(customId);
  });

  it('verifies security headers from Helmet are present on responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('centralized error handler attaches requestId to error envelope on not found endpoints', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });
});
