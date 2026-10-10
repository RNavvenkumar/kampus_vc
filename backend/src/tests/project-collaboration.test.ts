import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app.js';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { CampaignBrief } from '../models/CampaignBrief.js';
import { CampaignProposal } from '../models/CampaignProposal.js';
import { Project } from '../models/Project.js';
import { ProjectSubmission } from '../models/ProjectSubmission.js';
import { ProjectMessage } from '../models/ProjectMessage.js';
import { ProjectActivity } from '../models/ProjectActivity.js';
import { Notification } from '../models/Notification.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { BrandProfile } from '../models/BrandProfile.js';
import { MediaAsset } from '../models/MediaAsset.js';
import { LocalStorageProvider } from '../storage/localStorageProvider.js';
import { storageService } from '../storage/storageService.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

describe('Phase 8 — Project Collaboration, Secure Messaging, Milestone Tracking & Deliverable Review Tests', () => {
  let testStorageDir: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    testStorageDir = path.join(process.cwd(), 'scratch', 'test-phase8-uploads');
    if (!fs.existsSync(testStorageDir)) {
      fs.mkdirSync(testStorageDir, { recursive: true });
    }
    const localProvider = new LocalStorageProvider(testStorageDir);
    storageService.setProvider(localProvider);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Session.deleteMany({});
    await CampaignBrief.deleteMany({});
    await CampaignProposal.deleteMany({});
    await Project.deleteMany({});
    await ProjectSubmission.deleteMany({});
    await ProjectMessage.deleteMany({});
    await ProjectActivity.deleteMany({});
    await Notification.deleteMany({});
    await CreatorProfile.deleteMany({});
    await BrandProfile.deleteMany({});
    await MediaAsset.deleteMany({});
  });

  // Helper: Setup full awarded project with creator, brand, proposal award, and third-party users
  async function setupAwardedProject() {
    // 1. Create Brand
    const brandReg = await request(app).post('/api/auth/register').send({
      name: 'Cybernetic Studios',
      email: 'producer@cybernetic.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'brand'
    });
    const brandCookie = brandReg.headers['set-cookie'][0];
    const brandId = brandReg.body.data.user.id;

    // 2. Publish Brief
    const briefRes = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', brandCookie)
      .send({
        title: '3D Cyberpunk Game Trailer',
        category: '3D Animation & CGI',
        summary: 'Produce a 60-second teaser trailer for an upcoming sci-fi game.',
        description: 'Complete high quality 3D character design, environment, and composited render.',
        requiredSpecialties: ['3D Modeling', 'Unreal Engine 5'],
        creativeTools: ['Unreal Engine', 'Blender'],
        deliverables: ['Character Concepts', '3D Environment Blockout', 'Final 4K Teaser Video'],
        budgetType: 'fixed',
        budgetMin: 8000,
        budgetMax: 8000,
        currency: 'USD',
        durationWeeks: 4
      });
    const briefId = briefRes.body.data.id;

    // Publish Brief so proposals can be accepted
    await request(app)
      .post(`/api/brand/briefs/${briefId}/publish`)
      .set('Cookie', brandCookie);

    // 3. Create Creator
    const creatorReg = await request(app).post('/api/auth/register').send({
      name: 'Elena Rostova',
      email: 'elena@renderforge.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'creator'
    });
    const creatorCookie = creatorReg.headers['set-cookie'][0];
    const creatorId = creatorReg.body.data.user.id;

    // 4. Submit Proposal
    const propRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creatorCookie)
      .send({
        briefId,
        pitchTitle: 'High-Fidelity Unreal Engine 5 Teaser',
        pitchMessage: 'Will create an ultra-cinematic 4K teaser with nanite environments and custom metahumans.',
        proposedPrice: 8000,
        currency: 'USD',
        deliveryDurationWeeks: 4,
        deliverables: ['Character Concepts', '3D Environment Blockout', 'Final 4K Teaser Video'],
        milestones: [
          {
            title: 'Concept & Blockout',
            description: 'Concept art and UE5 level blockout',
            amount: 3000,
            durationWeeks: 2,
            order: 1
          },
          {
            title: 'Final Lighting & 4K Render',
            description: 'Color grading and master 4K MP4 export',
            amount: 5000,
            durationWeeks: 2,
            order: 2
          }
        ],
        revisionAllowance: 2,
        isDraft: false
      });
    const proposalId = propRes.body.data.id;

    // 5. Brand Accepts Proposal & Awards Project
    const acceptRes = await request(app)
      .post(`/api/brand/proposals/${proposalId}/accept`)
      .set('Cookie', brandCookie);
    const projectId = acceptRes.body.data.project.id;

    // 6. Create Unrelated Third-Party Users
    const thirdPartyCreator = await request(app).post('/api/auth/register').send({
      name: 'Unrelated Creator',
      email: 'unrelated.creator@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'creator'
    });
    const thirdPartyCreatorCookie = thirdPartyCreator.headers['set-cookie'][0];

    const thirdPartyBrand = await request(app).post('/api/auth/register').send({
      name: 'Unrelated Brand',
      email: 'unrelated.brand@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'brand'
    });
    const thirdPartyBrandCookie = thirdPartyBrand.headers['set-cookie'][0];

    return {
      brandCookie,
      brandId,
      creatorCookie,
      creatorId,
      briefId,
      proposalId,
      projectId,
      thirdPartyCreatorCookie,
      thirdPartyBrandCookie
    };
  }

  // --------------------------------------------------------------------------
  // 1. Participant Authorization & Project Workspace Isolation
  // --------------------------------------------------------------------------
  it('strictly allows authorized creator and brand while rejecting third parties', async () => {
    const {
      brandCookie,
      creatorCookie,
      projectId,
      thirdPartyCreatorCookie,
      thirdPartyBrandCookie
    } = await setupAwardedProject();

    // 1. Creator can read project
    const creatorView = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', creatorCookie);
    expect(creatorView.status).toBe(200);
    expect(creatorView.body.data.title).toBe('3D Cyberpunk Game Trailer');
    expect(creatorView.body.data.isCreator).toBe(true);
    expect(creatorView.body.data.isBrand).toBe(false);

    // 2. Brand can read project
    const brandView = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', brandCookie);
    expect(brandView.status).toBe(200);
    expect(brandView.body.data.isCreator).toBe(false);
    expect(brandView.body.data.isBrand).toBe(true);

    // 3. Unrelated creator receives 404 (or access denied)
    const rogueCreator = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', thirdPartyCreatorCookie);
    expect(rogueCreator.status).toBe(404);

    // 4. Unrelated brand receives 404
    const rogueBrand = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', thirdPartyBrandCookie);
    expect(rogueBrand.status).toBe(404);

    // 5. Unauthenticated request receives 401
    const unauth = await request(app).get(`/api/projects/${projectId}`);
    expect(unauth.status).toBe(401);
  });

  // --------------------------------------------------------------------------
  // 2. Project Kickoff & Milestone Tracking
  // --------------------------------------------------------------------------
  it('supports project kickoff and enforces milestone status transitions', async () => {
    const { brandCookie, creatorCookie, projectId } = await setupAwardedProject();

    // Kick off project
    const kickoffRes = await request(app)
      .patch(`/api/projects/${projectId}/status`)
      .set('Cookie', creatorCookie)
      .send({ status: 'in_progress' });
    expect(kickoffRes.status).toBe(200);
    expect(kickoffRes.body.data.status).toBe('in_progress');

    // Retrieve milestones
    const msRes = await request(app)
      .get(`/api/projects/${projectId}/milestones`)
      .set('Cookie', creatorCookie);
    expect(msRes.status).toBe(200);
    expect(msRes.body.data.length).toBe(2);

    const firstMilestoneId = msRes.body.data[0].id;
    expect(msRes.body.data[0].status).toBe('not_started');

    // Brand cannot directly change milestone status to in_progress (creator work only)
    const brandAttempt = await request(app)
      .patch(`/api/projects/${projectId}/milestones/${firstMilestoneId}/status`)
      .set('Cookie', brandCookie)
      .send({ status: 'in_progress' });
    expect(brandAttempt.status).toBe(403);

    // Creator starts milestone
    const creatorStart = await request(app)
      .patch(`/api/projects/${projectId}/milestones/${firstMilestoneId}/status`)
      .set('Cookie', creatorCookie)
      .send({ status: 'in_progress' });
    expect(creatorStart.status).toBe(200);
    expect(creatorStart.body.data.status).toBe('in_progress');
  });

  // --------------------------------------------------------------------------
  // 3. Deliverable Submissions & Phase 7 Media Integration
  // --------------------------------------------------------------------------
  it('allows creator to submit deliverables with authorized media assets and blocks foreign assets', async () => {
    const { creatorCookie, brandCookie, creatorId, projectId, thirdPartyCreatorCookie } =
      await setupAwardedProject();

    const msRes = await request(app)
      .get(`/api/projects/${projectId}/milestones`)
      .set('Cookie', creatorCookie);
    const firstMilestoneId = msRes.body.data[0].id;

    // 1. Create a valid ready media asset owned by the creator
    const creatorAsset = await MediaAsset.create({
      userId: new mongoose.Types.ObjectId(creatorId),
      storageProvider: 'local',
      objectKey: `media/${creatorId}/concept-render-v1.png`,
      originalFilename: 'concept-render-v1.png',
      sanitizedFilename: 'concept-render-v1.png',
      mimeType: 'image/png',
      category: 'image',
      fileSizeBytes: 1048576,
      status: 'ready',
      visibility: 'private',
      linkedEntities: []
    });

    // 2. Create another asset owned by a foreign third-party user
    const foreignAsset = await MediaAsset.create({
      userId: new mongoose.Types.ObjectId(),
      storageProvider: 'local',
      objectKey: 'media/other/foreign-art.png',
      originalFilename: 'foreign-art.png',
      sanitizedFilename: 'foreign-art.png',
      mimeType: 'image/png',
      category: 'image',
      fileSizeBytes: 524288,
      status: 'ready',
      visibility: 'private',
      linkedEntities: []
    });

    // 3. Brand attempting to submit deliverable receives 403 (Creator action only)
    const brandSubmit = await request(app)
      .post(`/api/projects/${projectId}/milestones/${firstMilestoneId}/submissions`)
      .set('Cookie', brandCookie)
      .send({
        submissionNotes: 'Brand trying to submit work',
        assetIds: [creatorAsset.id]
      });
    expect(brandSubmit.status).toBe(403);

    // 4. Creator attempting to attach foreign asset receives 403
    const foreignAttach = await request(app)
      .post(`/api/projects/${projectId}/milestones/${firstMilestoneId}/submissions`)
      .set('Cookie', creatorCookie)
      .send({
        submissionNotes: 'Trying to attach someone else asset',
        assetIds: [foreignAsset.id]
      });
    expect(foreignAttach.status).toBe(403);
    expect(foreignAttach.body.error.code).toBe('UNAUTHORIZED_ASSET');

    // 5. Valid submission by creator with owned asset
    const validSubmit = await request(app)
      .post(`/api/projects/${projectId}/milestones/${firstMilestoneId}/submissions`)
      .set('Cookie', creatorCookie)
      .send({
        submissionNotes: 'Completed 3D character concepts and UE5 blockout scene renders.',
        assetIds: [creatorAsset.id],
        externalLinks: ['https://figma.com/file/sample-blockout']
      });
    expect(validSubmit.status).toBe(201);
    expect(validSubmit.body.data.version).toBe(1);
    expect(validSubmit.body.data.status).toBe('submitted');
    expect(validSubmit.body.data.milestoneStatus).toBe('submitted_for_review');

    // Confirm asset was linked to project in DB
    const updatedAsset = await MediaAsset.findById(creatorAsset.id);
    expect(
      updatedAsset?.linkedEntities.some(
        (e) => e.entityType === 'project' && e.entityId.toString() === projectId
      )
    ).toBe(true);

    // Confirm notification sent to brand
    const notifs = await Notification.find({ type: 'deliverable_submitted' });
    expect(notifs.length).toBe(1);
  });

  // --------------------------------------------------------------------------
  // 4. Brand Deliverable Review, Revisions & Versioning
  // --------------------------------------------------------------------------
  it('enforces required feedback on revision requests, version incrementing, and version approval', async () => {
    const { creatorCookie, brandCookie, creatorId, projectId } = await setupAwardedProject();

    const msRes = await request(app)
      .get(`/api/projects/${projectId}/milestones`)
      .set('Cookie', creatorCookie);
    const firstMilestoneId = msRes.body.data[0].id;

    // Submit Version 1
    const subRes1 = await request(app)
      .post(`/api/projects/${projectId}/milestones/${firstMilestoneId}/submissions`)
      .set('Cookie', creatorCookie)
      .send({
        submissionNotes: 'Initial character blockout draft v1'
      });
    const sub1Id = subRes1.body.data.id;

    // Brand requesting revision without feedback message fails with 400
    const emptyFeedbackReview = await request(app)
      .post(`/api/projects/${projectId}/submissions/${sub1Id}/review`)
      .set('Cookie', brandCookie)
      .send({
        action: 'request_revision',
        feedback: ''
      });
    expect(emptyFeedbackReview.status).toBe(400);
    expect(emptyFeedbackReview.body.error.code).toBe('FEEDBACK_REQUIRED');

    // Brand requests revision with clear feedback
    const revisionReview = await request(app)
      .post(`/api/projects/${projectId}/submissions/${sub1Id}/review`)
      .set('Cookie', brandCookie)
      .send({
        action: 'request_revision',
        feedback: 'Please brighten the cyberpunk neon accents and adjust character silhouette.'
      });
    expect(revisionReview.status).toBe(200);
    expect(revisionReview.body.data.submission.status).toBe('revision_requested');
    expect(revisionReview.body.data.milestoneStatus).toBe('revision_requested');

    // Creator resubmits with Version 2
    const subRes2 = await request(app)
      .post(`/api/projects/${projectId}/milestones/${firstMilestoneId}/submissions`)
      .set('Cookie', creatorCookie)
      .send({
        submissionNotes: 'Updated character model with elevated neon highlights per feedback.'
      });
    expect(subRes2.status).toBe(201);
    expect(subRes2.body.data.version).toBe(2);
    expect(subRes2.body.data.milestoneStatus).toBe('submitted_for_review');
    const sub2Id = subRes2.body.data.id;

    // Brand approves Version 2
    const approveRes = await request(app)
      .post(`/api/projects/${projectId}/submissions/${sub2Id}/review`)
      .set('Cookie', brandCookie)
      .send({
        action: 'approve',
        feedback: 'Approved! This matches the brief perfectly.'
      });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.submission.status).toBe('approved');
    expect(approveRes.body.data.milestoneStatus).toBe('approved');

    // Duplicate review on already approved submission fails with 409
    const dupReview = await request(app)
      .post(`/api/projects/${projectId}/submissions/${sub2Id}/review`)
      .set('Cookie', brandCookie)
      .send({ action: 'approve' });
    expect(dupReview.status).toBe(409);
    expect(dupReview.body.error.code).toBe('SUBMISSION_ALREADY_REVIEWED');

    // Attempting to submit another deliverable on already approved milestone fails with 409
    const postApprovalSubmit = await request(app)
      .post(`/api/projects/${projectId}/milestones/${firstMilestoneId}/submissions`)
      .set('Cookie', creatorCookie)
      .send({ submissionNotes: 'Trying to submit to already approved milestone' });
    expect(postApprovalSubmit.status).toBe(409);
    expect(postApprovalSubmit.body.error.code).toBe('MILESTONE_ALREADY_APPROVED');
  });

  // --------------------------------------------------------------------------
  // 5. Project Completion Safeguards
  // --------------------------------------------------------------------------
  it('blocks project completion while any milestone remains unapproved and allows completion once all approved', async () => {
    const { creatorCookie, brandCookie, projectId } = await setupAwardedProject();

    // Attempting to complete project while milestones are not approved fails with 409
    const earlyComplete = await request(app)
      .patch(`/api/projects/${projectId}/status`)
      .set('Cookie', brandCookie)
      .send({ status: 'completed' });
    expect(earlyComplete.status).toBe(409);
    expect(earlyComplete.body.error.code).toBe('UNFINISHED_DELIVERABLES');

    // Approve both milestones
    const msRes = await request(app)
      .get(`/api/projects/${projectId}/milestones`)
      .set('Cookie', creatorCookie);
    const m1Id = msRes.body.data[0].id;
    const m2Id = msRes.body.data[1].id;

    // Submit and approve m1
    const s1 = await request(app)
      .post(`/api/projects/${projectId}/milestones/${m1Id}/submissions`)
      .set('Cookie', creatorCookie)
      .send({ submissionNotes: 'Done with milestone 1' });
    await request(app)
      .post(`/api/projects/${projectId}/submissions/${s1.body.data.id}/review`)
      .set('Cookie', brandCookie)
      .send({ action: 'approve' });

    // Submit and approve m2
    const s2 = await request(app)
      .post(`/api/projects/${projectId}/milestones/${m2Id}/submissions`)
      .set('Cookie', creatorCookie)
      .send({ submissionNotes: 'Done with milestone 2' });
    await request(app)
      .post(`/api/projects/${projectId}/submissions/${s2.body.data.id}/review`)
      .set('Cookie', brandCookie)
      .send({ action: 'approve' });

    // Now all milestones are approved -> Completion succeeds
    const completeRes = await request(app)
      .patch(`/api/projects/${projectId}/status`)
      .set('Cookie', brandCookie)
      .send({ status: 'completed' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');

    // Confirm agreement snapshot is still completely intact and immutable
    const finalProject = await Project.findById(projectId);
    expect(finalProject?.agreementSnapshot.agreedPrice).toBe(8000);
    expect(finalProject?.agreementSnapshot.currency).toBe('USD');
  });

  // --------------------------------------------------------------------------
  // 6. Persistent Project Messaging
  // --------------------------------------------------------------------------
  it('supports persistent messaging between authorized participants and enforces message validation', async () => {
    const { creatorCookie, brandCookie, projectId, thirdPartyCreatorCookie } =
      await setupAwardedProject();

    // 1. Creator sends message
    const msg1Res = await request(app)
      .post(`/api/projects/${projectId}/messages`)
      .set('Cookie', creatorCookie)
      .send({ content: 'Hi! Looking forward to collaborating on this cyberpunk trailer.' });
    expect(msg1Res.status).toBe(201);
    expect(msg1Res.body.data.senderRole).toBe('creator');

    // 2. Brand replies
    const msg2Res = await request(app)
      .post(`/api/projects/${projectId}/messages`)
      .set('Cookie', brandCookie)
      .send({
        content: 'Excited to see the first environment blockouts!',
        replyToMessageId: msg1Res.body.data.id
      });
    expect(msg2Res.status).toBe(201);
    expect(msg2Res.body.data.senderRole).toBe('brand');

    // 3. Empty message fails with 400
    const emptyMsg = await request(app)
      .post(`/api/projects/${projectId}/messages`)
      .set('Cookie', creatorCookie)
      .send({ content: '' });
    expect(emptyMsg.status).toBe(400);

    // 4. Retrieve messages
    const listRes = await request(app)
      .get(`/api/projects/${projectId}/messages`)
      .set('Cookie', creatorCookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(2);

    // 5. Third-party cannot read messages
    const rogueMsgRead = await request(app)
      .get(`/api/projects/${projectId}/messages`)
      .set('Cookie', thirdPartyCreatorCookie);
    expect(rogueMsgRead.status).toBe(404);
  });

  // --------------------------------------------------------------------------
  // 7. Activity Timeline & Notifications
  // --------------------------------------------------------------------------
  it('records chronological activity events and delivers notifications to proper recipients', async () => {
    const { creatorCookie, brandCookie, projectId, creatorId, brandId } = await setupAwardedProject();

    // Send a message to generate activity
    await request(app)
      .post(`/api/projects/${projectId}/messages`)
      .set('Cookie', creatorCookie)
      .send({ content: 'Timeline test message' });

    // Retrieve activity log
    const actRes = await request(app)
      .get(`/api/projects/${projectId}/activity`)
      .set('Cookie', brandCookie);
    expect(actRes.status).toBe(200);
    expect(actRes.body.data.length).toBeGreaterThan(0);

    // Confirm notification exists for the brand recipient
    const brandNotifs = await Notification.find({ recipientId: brandId });
    expect(brandNotifs.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // 8. Media Access Authorization for Project Participants
  // --------------------------------------------------------------------------
  it('grants brand client access to creator private media attached to project deliverable', async () => {
    const { creatorCookie, brandCookie, creatorId, projectId, thirdPartyBrandCookie } =
      await setupAwardedProject();

    // 1. Creator creates a private media asset
    const privateAsset = await MediaAsset.create({
      userId: new mongoose.Types.ObjectId(creatorId),
      storageProvider: 'local',
      objectKey: `media/${creatorId}/private-deliverable.png`,
      originalFilename: 'private-deliverable.png',
      sanitizedFilename: 'private-deliverable.png',
      mimeType: 'image/png',
      category: 'image',
      fileSizeBytes: 1048576,
      status: 'ready',
      visibility: 'private',
      linkedEntities: []
    });

    const msRes = await request(app)
      .get(`/api/projects/${projectId}/milestones`)
      .set('Cookie', creatorCookie);
    const m1Id = msRes.body.data[0].id;

    // 2. Creator attaches private asset to deliverable
    await request(app)
      .post(`/api/projects/${projectId}/milestones/${m1Id}/submissions`)
      .set('Cookie', creatorCookie)
      .send({
        submissionNotes: 'Attaching private deliverable',
        assetIds: [privateAsset.id]
      });

    // 3. Brand client requests access URL for this private asset -> SUCCEEDS (Project Participant)
    const brandAccess = await request(app)
      .get(`/api/media/assets/${privateAsset.id}/access`)
      .set('Cookie', brandCookie);
    expect(brandAccess.status).toBe(200);
    expect(brandAccess.body.data.accessUrl).toBeDefined();

    // 4. Third-party brand requests access -> FORBIDDEN (403)
    const rogueAccess = await request(app)
      .get(`/api/media/assets/${privateAsset.id}/access`)
      .set('Cookie', thirdPartyBrandCookie);
    expect(rogueAccess.status).toBe(403);
  });
});
