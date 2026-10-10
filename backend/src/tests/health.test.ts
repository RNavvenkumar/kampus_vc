import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('Kampus.VC Backend Health & API Gateway', () => {
  const app = createApp();

  it('GET /api/health returns 200 with truthful status payload', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('server');
    expect(response.body.services.server).toHaveProperty('status', 'running');
    expect(response.body.services).toHaveProperty('database');
  });

  it('GET /api/unknown-endpoint returns standard 404 error envelope', async () => {
    const response = await request(app).get('/api/unknown-endpoint');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    expect(response.body.error).toHaveProperty('message');
  });

  it('GET /api/v1/creators returns 501 Not Implemented envelope', async () => {
    const response = await request(app).get('/api/v1/creators');

    expect(response.status).toBe(501);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
  });
});
