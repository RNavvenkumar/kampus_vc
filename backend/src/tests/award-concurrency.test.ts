import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CampaignProposal } from '../models/CampaignProposal.js';
import { Project } from '../models/Project.js';
import { Notification } from '../models/Notification.js';
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
  await CampaignBrief.deleteMany({});
  await CampaignProposal.deleteMany({});
  await Project.deleteMany({});
  await Notification.deleteMany({});
  await CreatorProfile.deleteMany({});
  await BrandProfile.deleteMany({});
});

describe('Phase 4 — Brand Review Center, Negotiation, Project Award & Concurrency Safety Tests', () => {
  async function createBrand(name = 'Acme Entertainment', email = 'brand@acme.com') {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    const cookie = res.headers['set-cookie'][0];

    const briefRes = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', cookie)
      .send({
        title: 'Cinematic VFX Title Sequence',
        category: 'VFX & Post-Production',
        summary: 'Opening title sequence for sci-fi documentary series',
        description: 'Design and composite 45-second high octane title sequence in 4K',
        budgetMin: 5000,
        budgetMax: 9000,
        currency: 'USD',
        durationWeeks: 6,
        deliverables: ['Storyboard animatic', 'Final 4K ProRes master']
      });

    const briefId = briefRes.body.data.id;

    await request(app)
      .post(`/api/brand/briefs/${briefId}/publish`)
      .set('Cookie', cookie);

    return { user: res.body.data.user, cookie, briefId };
  }

  async function createCreator(name: string, email: string) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name,
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    const cookie = res.headers['set-cookie'][0];

    await request(app)
      .patch('/api/creator/profile/me')
      .set('Cookie', cookie)
      .send({
        displayName: name,
        headline: 'Cinematic Motion Director',
        biography: 'Specialized in VFX, titles, and procedural 3D motion.',
        specialties: ['VFX & Post-Production', 'Motion Graphics']
      });

    return { user: res.body.data.user, cookie };
  }

  it('ensures drafts are invisible in the brand review center', async () => {
    const brand = await createBrand();
    const creator = await createCreator('Creator A', 'a@test.com');

    // Create a draft proposal
    await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Private draft proposal message that should not be visible to brand.',
        proposedPrice: 6000,
        currency: 'USD',
        deliveryDurationWeeks: 4,
        deliverables: ['Draft cut'],
        isDraft: true
      });

    // Brand checks proposals
    const brandReviewRes = await request(app)
      .get('/api/brand/proposals')
      .set('Cookie', brand.cookie);

    expect(brandReviewRes.status).toBe(200);
    expect(brandReviewRes.body.data).toHaveLength(0);
  });

  it('allows brand to shortlist and request revisions, and creator to resubmit', async () => {
    const brand = await createBrand();
    const creator = await createCreator('Creator Maya', 'maya@test.com');

    // Submit proposal
    const submitRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchTitle: 'Dynamic Procedural Particles & Typography',
        pitchMessage: 'I can deliver the sequence within 5 weeks using Houdini and After Effects.',
        proposedPrice: 7500,
        currency: 'USD',
        deliveryDurationWeeks: 5,
        deliverables: ['Animatic', 'Render passes', 'Final master']
      });
    const proposalId = submitRes.body.data.id;

    // Brand shortlists
    const shortlistRes = await request(app)
      .post(`/api/brand/proposals/${proposalId}/shortlist`)
      .set('Cookie', brand.cookie);
    expect(shortlistRes.status).toBe(200);
    expect(shortlistRes.body.data.status).toBe('shortlisted');

    // Brand requests revision
    const revisionRes = await request(app)
      .post(`/api/brand/proposals/${proposalId}/request-revision`)
      .set('Cookie', brand.cookie)
      .send({
        message: 'Could you expedite the timeline to 4 weeks and add a sound design pass?'
      });
    expect(revisionRes.status).toBe(200);
    expect(revisionRes.body.data.status).toBe('revision_requested');
    expect(revisionRes.body.data.revisionMessage).toContain('expedite the timeline');

    // Creator patches proposal and resubmits
    await request(app)
      .patch(`/api/creator/proposals/${proposalId}`)
      .set('Cookie', creator.cookie)
      .send({
        deliveryDurationWeeks: 4,
        deliverables: ['Animatic', 'Render passes', 'Sound design pass', 'Final master'],
        proposedPrice: 8000
      });

    const resubmitRes = await request(app)
      .post(`/api/creator/proposals/${proposalId}/submit`)
      .set('Cookie', creator.cookie);

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe('submitted');
    expect(resubmitRes.body.data.revisionNumber).toBe(2);
  });

  it('accepts winning proposal, snapshots agreement terms, creates project, and declines competing proposals', async () => {
    const brand = await createBrand();
    const creator1 = await createCreator('Winner Creator', 'winner@test.com');
    const creator2 = await createCreator('Runner-up Creator', 'runner@test.com');

    // Creator 1 submits proposal
    const prop1Res = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator1.cookie)
      .send({
        briefId: brand.briefId,
        pitchTitle: 'Winning 4K Motion Direction',
        pitchMessage: 'Award-winning creative direction and rapid delivery for this campaign.',
        proposedPrice: 7000,
        currency: 'USD',
        deliveryDurationWeeks: 4,
        deliverables: ['Animatic', 'Final 4K ProRes'],
        milestones: [
          { title: 'Animatic approval', amount: 3000, durationWeeks: 2, order: 1 },
          { title: 'Final conform & delivery', amount: 4000, durationWeeks: 2, order: 2 }
        ]
      });
    const prop1Id = prop1Res.body.data.id;

    // Creator 2 submits competing proposal
    const prop2Res = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator2.cookie)
      .send({
        briefId: brand.briefId,
        pitchTitle: 'Alternative Creative Direction',
        pitchMessage: 'High quality stylized aesthetic with hand-drawn typography integration.',
        proposedPrice: 6500,
        currency: 'USD',
        deliveryDurationWeeks: 5,
        deliverables: ['Animatic', 'Stylized master']
      });
    const prop2Id = prop2Res.body.data.id;

    // Brand accepts Creator 1's proposal
    const acceptRes = await request(app)
      .post(`/api/brand/proposals/${prop1Id}/accept`)
      .set('Cookie', brand.cookie);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.proposal.status).toBe('accepted');
    expect(acceptRes.body.data.proposal.acceptedAgreementSnapshot).toBeDefined();
    expect(acceptRes.body.data.proposal.acceptedAgreementSnapshot.agreedPrice).toBe(7000);
    expect(acceptRes.body.data.brief.status).toBe('awarded');

    // Verify Project record created
    const project = acceptRes.body.data.project;
    expect(project).toBeDefined();
    expect(project.projectReference).toMatch(/^PRJ-/);
    expect(project.status).toBe('ready_for_kickoff');
    expect(project.agreedPrice).toBe(7000);

    // Verify competing proposal was transitioned to declined
    const prop2Check = await CampaignProposal.findById(prop2Id);
    expect(prop2Check?.status).toBe('declined');

    // Verify campaign brief is removed from public discovery
    const publicBriefsRes = await request(app).get('/api/briefs');
    expect(publicBriefsRes.status).toBe(200);
    const foundAwarded = (publicBriefsRes.body.data.briefs || []).find((b: any) => b.id === brand.briefId);
    expect(foundAwarded).toBeUndefined();

    // Verify Project endpoint returns project for authenticated winner
    const projectsRes = await request(app)
      .get('/api/projects')
      .set('Cookie', creator1.cookie);
    expect(projectsRes.status).toBe(200);
    expect(projectsRes.body.data).toHaveLength(1);
    expect(projectsRes.body.data[0].projectReference).toBe(project.projectReference);

    // Notifications check: Winner and competing creators received notifications
    const winnerNotifsRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', creator1.cookie);
    expect(winnerNotifsRes.status).toBe(200);
    expect(winnerNotifsRes.body.data.some((n: any) => n.type === 'proposal_accepted')).toBe(true);

    const runnerNotifsRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', creator2.cookie);
    expect(runnerNotifsRes.status).toBe(200);
    expect(runnerNotifsRes.body.data.some((n: any) => n.type === 'campaign_awarded_other')).toBe(true);
  });

  it('concurrency test: prevents double award on the same campaign brief', async () => {
    const brand = await createBrand();
    const creator1 = await createCreator('Creator 1', 'c1@test.com');
    const creator2 = await createCreator('Creator 2', 'c2@test.com');

    // Submit two proposals
    const p1 = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator1.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Proposal 1 for concurrency race condition testing.',
        proposedPrice: 6000,
        currency: 'USD',
        deliveryDurationWeeks: 4,
        deliverables: ['Deliverable 1']
      });

    const p2 = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator2.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Proposal 2 for concurrency race condition testing.',
        proposedPrice: 6500,
        currency: 'USD',
        deliveryDurationWeeks: 4,
        deliverables: ['Deliverable 2']
      });

    // Accept first proposal
    const accept1 = await request(app)
      .post(`/api/brand/proposals/${p1.body.data.id}/accept`)
      .set('Cookie', brand.cookie);
    expect(accept1.status).toBe(200);

    // Attempt to accept second proposal
    const accept2 = await request(app)
      .post(`/api/brand/proposals/${p2.body.data.id}/accept`)
      .set('Cookie', brand.cookie);

    expect(accept2.status).toBe(409);
    expect(accept2.body.error.code).toBe('INVALID_STATE_TRANSITION'); // because p2 was declined automatically
  });

  it('supports notification unread counts and marking as read', async () => {
    const brand = await createBrand();
    const creator = await createCreator('Notify Creator', 'notify@test.com');

    // Submitting a proposal creates a notification for brand
    await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creator.cookie)
      .send({
        briefId: brand.briefId,
        pitchMessage: 'Proposal generating brand notification on submission.',
        proposedPrice: 5500,
        currency: 'USD',
        deliveryDurationWeeks: 3,
        deliverables: ['Sample Deliverable']
      });

    // Brand unread count
    const unreadRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', brand.cookie);

    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.data.count).toBeGreaterThan(0);

    // Brand marks all as read
    const markRes = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('Cookie', brand.cookie);
    expect(markRes.status).toBe(200);

    // Unread count is now 0
    const checkRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', brand.cookie);
    expect(checkRes.body.data.count).toBe(0);
  });
});
