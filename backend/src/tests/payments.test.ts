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
import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { FinancialLedgerEntry } from '../models/FinancialLedgerEntry.js';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.js';
import { MockPaymentProvider } from '../payments/mockPaymentProvider.js';
import { setPaymentProviderForTesting } from '../payments/paymentFactory.js';

let mongoServer: MongoMemoryServer;
const app = createApp();

describe('Phase 9 — Real Payment Integration, Milestone Payments, Refunds & Ledger Tests', () => {
  let mockProvider: MockPaymentProvider;

  let brandCookie: string;
  let brandId: string;
  let otherBrandCookie: string;
  let creatorCookie: string;
  let creatorId: string;

  let briefId: string;
  let proposalId: string;
  let projectId: string;
  let milestone1Id: string;
  let milestone2Id: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);

    mockProvider = new MockPaymentProvider();
    setPaymentProviderForTesting(mockProvider);
  });

  afterAll(async () => {
    setPaymentProviderForTesting(null);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Session.deleteMany({});
    await CampaignBrief.deleteMany({});
    await CampaignProposal.deleteMany({});
    await Project.deleteMany({});
    await Payment.deleteMany({});
    await Refund.deleteMany({});
    await FinancialLedgerEntry.deleteMany({});
    await PaymentWebhookEvent.deleteMany({});

    // 1. Create Primary Brand User
    const brandRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Starlight Media Brand',
        email: 'brand_pay@kampus.vc',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    expect(brandRes.status).toBe(201);
    brandCookie = brandRes.headers['set-cookie'][0];
    brandId = brandRes.body.data.user.id;

    // 2. Create Other Brand User (for isolation checks)
    const otherBrandRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Nexus Corp Brand',
        email: 'other_pay@kampus.vc',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'brand'
      });
    expect(otherBrandRes.status).toBe(201);
    otherBrandCookie = otherBrandRes.headers['set-cookie'][0];

    // 3. Create Creator User
    const creatorRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alex Rivera',
        email: 'alex_pay@kampus.vc',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'creator'
      });
    expect(creatorRes.status).toBe(201);
    creatorCookie = creatorRes.headers['set-cookie'][0];
    creatorId = creatorRes.body.data.user.id;

    // 4. Create and publish Brief
    const briefRes = await request(app)
      .post('/api/brand/briefs')
      .set('Cookie', brandCookie)
      .send({
        title: 'Cyberpunk 3D CGI Commercial',
        category: '3D Animation & CGI',
        summary: 'High-end 3D visual teaser for product launch',
        description: 'Complete high quality 3D character design, environment, and composited render.',
        targetAudience: 'Tech enthusiasts',
        budgetType: 'fixed',
        budgetMin: 2000,
        budgetMax: 6000,
        currency: 'USD',
        durationWeeks: 4,
        deliverables: ['1x 30s 4K Render', '2x Cutdowns'],
        requiredSpecialties: ['3D Modeling', 'Octane Render']
      });
    briefId = briefRes.body.data.id;

    await request(app)
      .post(`/api/brand/briefs/${briefId}/publish`)
      .set('Cookie', brandCookie);

    // 5. Creator submits proposal with 2 structured milestones
    const proposalRes = await request(app)
      .post('/api/creator/proposals')
      .set('Cookie', creatorCookie)
      .send({
        briefId,
        pitchTitle: 'Cinema 4D Visual Teaser',
        pitchMessage: 'We will create an ultra-cinematic 3D render workflow with detailed visual milestones for this project.',
        proposedPrice: 4000,
        currency: 'USD',
        deliveryDurationWeeks: 4,
        deliverables: ['1x 30s 4K Render', '2x Cutdowns'],
        milestones: [
          { title: 'Milestone 1: 3D Animatic & Concept', amount: 1500, durationWeeks: 2, order: 1 },
          { title: 'Milestone 2: Final 4K Shading & Lighting', amount: 2500, durationWeeks: 2, order: 2 }
        ],
        revisionAllowance: 2,
        isDraft: false
      });
    proposalId = proposalRes.body.data.id;

    // 6. Brand accepts proposal and awards project
    const awardRes = await request(app)
      .post(`/api/brand/proposals/${proposalId}/accept`)
      .set('Cookie', brandCookie);
    expect(awardRes.status).toBe(200);
    projectId = awardRes.body.data.project.id;

    const projectDoc = await Project.findById(projectId);
    expect(projectDoc).toBeDefined();
    expect(projectDoc?.milestones.length).toBe(2);
    milestone1Id = projectDoc!.milestones[0]._id!.toString();
    milestone2Id = projectDoc!.milestones[1]._id!.toString();
  });

  describe('1. Payment Order Creation & Authorization', () => {
    it('allows authorized brand to create an escrow payment order for Milestone 1', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({
          milestoneId: milestone1Id
        });

      expect(res.status).toBe(201);
      expect(res.body.orderId).toMatch(/^order_mock_/);
      expect(res.body.amountMinor).toBe(150000); // 1500 USD * 100
      expect(res.body.currency).toBe('USD');
      expect(res.body.payment.status).toBe('order_created');
      expect(res.body.payment.paymentPurpose).toBe('milestone_payment');
      expect(res.body.payment.milestoneTitle).toBe('Milestone 1: 3D Animatic & Concept');
    });

    it('allows brand to create full project payment order when milestoneId is omitted', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.amountMinor).toBe(400000); // 4000 USD * 100
      expect(res.body.currency).toBe('USD');
      expect(res.body.payment.paymentPurpose).toBe('full_project');
    });

    it('rejects creator from creating brand payment orders with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', creatorCookie)
        .send({
          milestoneId: milestone1Id
        });

      expect(res.status).toBe(403);
    });

    it('rejects another brand from initiating payment on this project', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', otherBrandCookie)
        .send({
          milestoneId: milestone1Id
        });

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated order creation with 401', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .send({
          milestoneId: milestone1Id
        });

      expect(res.status).toBe(401);
    });

    it('returns existing order idempotently when identical idempotencyKey is used', async () => {
      const idempotencyKey = 'unique_test_order_key_999';

      const res1 = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({
          milestoneId: milestone1Id,
          idempotencyKey
        });
      expect(res1.status).toBe(201);
      const firstOrderId = res1.body.orderId;

      const res2 = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({
          milestoneId: milestone1Id,
          idempotencyKey
        });
      expect(res2.status).toBe(200);
      expect(res2.body.orderId).toBe(firstOrderId);

      // Verify no duplicate database records
      const count = await Payment.countDocuments({ idempotencyKey });
      expect(count).toBe(1);
    });
  });

  describe('2. Checkout Verification & Double-Entry Ledger Recording', () => {
    it('verifies valid checkout signature, captures payment, transitions project, and records balanced ledger entries', async () => {
      // 1. Create order
      const orderRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone1Id });
      expect(orderRes.status).toBe(201);

      const paymentId = orderRes.body.payment.id;
      const orderId = orderRes.body.orderId;
      const gatewayPaymentId = `pay_mock_${Date.now()}`;
      const validSignature = mockProvider.generateValidSignature(orderId, gatewayPaymentId);

      // 2. Submit verification
      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Cookie', brandCookie)
        .send({
          paymentId,
          gatewayOrderId: orderId,
          gatewayPaymentId,
          gatewaySignature: validSignature
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.payment.status).toBe('captured');
      expect(verifyRes.body.payment.capturedAmountMinor).toBe(150000);
      expect(verifyRes.body.payment.remainingRefundableAmountMinor).toBe(150000);
      expect(verifyRes.body.ledgerSummary.isInBalance).toBe(true);
      expect(verifyRes.body.ledgerSummary.heldInEscrowMinor).toBe(150000);

      // Verify Project status transitioned from ready_for_kickoff to in_progress
      const updatedProject = await Project.findById(projectId);
      expect(updatedProject?.status).toBe('in_progress');

      // Verify Ledger entries in database
      const ledgerEntries = await FinancialLedgerEntry.find({ projectId });
      expect(ledgerEntries.length).toBe(2);
      const debitEntry = ledgerEntries.find((e) => e.account === 'brand_funds');
      const creditEntry = ledgerEntries.find((e) => e.account === 'escrow_hold');
      expect(debitEntry?.debitMinor).toBe(150000);
      expect(creditEntry?.creditMinor).toBe(150000);
    });

    it('rejects tampered or invalid checkout signature and records payment failure', async () => {
      const orderRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone1Id });
      expect(orderRes.status).toBe(201);

      const paymentId = orderRes.body.payment.id;
      const orderId = orderRes.body.orderId;

      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Cookie', brandCookie)
        .send({
          paymentId,
          gatewayOrderId: orderId,
          gatewayPaymentId: 'pay_tampered_123',
          gatewaySignature: 'invalid_sha256_hash_here'
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error.code).toBe('INVALID_SIGNATURE');

      const failedPayment = await Payment.findById(paymentId);
      expect(failedPayment?.status).toBe('failed');
      expect(failedPayment?.failureReason).toBeDefined();
    });

    it('rejects paying an already captured milestone to prevent double-charging', async () => {
      // 1. Create and capture milestone 1
      const orderRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone1Id });

      const paymentId = orderRes.body.payment.id;
      const orderId = orderRes.body.orderId;
      const gatewayPaymentId = `pay_mock_${Date.now()}`;
      const validSignature = mockProvider.generateValidSignature(orderId, gatewayPaymentId);

      await request(app)
        .post('/api/payments/verify')
        .set('Cookie', brandCookie)
        .send({ paymentId, gatewayOrderId: orderId, gatewayPaymentId, gatewaySignature: validSignature });

      // 2. Attempt to create second order for the same milestone
      const duplicateRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone1Id });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.error.code).toBe('MILESTONE_ALREADY_PAID');
    });
  });

  describe('3. Webhook Ingestion, Replay Protection & Idempotency', () => {
    it('processes signed payment.captured webhook event and avoids duplicate processing on replay', async () => {
      // 1. Create order
      const orderRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone1Id });
      const orderId = orderRes.body.orderId;

      const eventId = `evt_${Date.now()}_abc`;
      const webhookPayload = {
        id: eventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_webhook_${Date.now()}`,
              order_id: orderId,
              amount: 150000,
              currency: 'USD',
              status: 'captured'
            }
          }
        }
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = mockProvider.generateValidWebhookSignature(rawBody);

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(webhookPayload);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('success');

      const payment = await Payment.findOne({ gatewayOrderId: orderId });
      expect(payment?.status).toBe('captured');

      // Duplicate / Replay webhook delivery
      const res2 = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(webhookPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('already_processed');

      // Verify no duplicate ledger entries created
      const ledgerCount = await FinancialLedgerEntry.countDocuments({ paymentId: payment?._id });
      expect(ledgerCount).toBe(2); // exactly 1 debit + 1 credit
    });

    it('rejects webhooks with invalid or missing signature', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Refunds & Compensating Financial Records', () => {
    let capturedPaymentId: string;

    beforeEach(async () => {
      // Fund and capture Milestone 1 ($1,500 = 150,000 cents)
      const orderRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone1Id });

      capturedPaymentId = orderRes.body.payment.id;
      const orderId = orderRes.body.orderId;
      const gatewayPaymentId = `pay_mock_${Date.now()}`;
      const validSignature = mockProvider.generateValidSignature(orderId, gatewayPaymentId);

      await request(app)
        .post('/api/payments/verify')
        .set('Cookie', brandCookie)
        .send({
          paymentId: capturedPaymentId,
          gatewayOrderId: orderId,
          gatewayPaymentId,
          gatewaySignature: validSignature
        });
    });

    it('allows brand to process a partial refund with compensating ledger entries', async () => {
      const refundRes = await request(app)
        .post(`/api/payments/${capturedPaymentId}/refunds`)
        .set('Cookie', brandCookie)
        .send({
          amountMinor: 50000, // $500 partial refund
          reason: 'Scope reduction for animatic revisions'
        });

      expect(refundRes.status).toBe(200);
      expect(refundRes.body.refund.status).toBe('processed');
      expect(refundRes.body.refund.amountMinor).toBe(50000);
      expect(refundRes.body.payment.status).toBe('partially_refunded');
      expect(refundRes.body.payment.refundedAmountMinor).toBe(50000);
      expect(refundRes.body.payment.remainingRefundableAmountMinor).toBe(100000);

      // Verify Compensating Ledger Entries
      const summary = await request(app)
        .get(`/api/projects/${projectId}/payments`)
        .set('Cookie', brandCookie);

      expect(summary.body.ledgerSummary.isInBalance).toBe(true);
      expect(summary.body.financials.heldInEscrowMinor).toBe(100000); // 150,000 - 50,000
      expect(summary.body.financials.totalRefundedMinor).toBe(50000);
    });

    it('allows brand to complete a full refund returning payment status to refunded', async () => {
      const refundRes = await request(app)
        .post(`/api/payments/${capturedPaymentId}/refunds`)
        .set('Cookie', brandCookie)
        .send({
          amountMinor: 150000, // full $1,500
          reason: 'Brand project cancellation by agreement'
        });

      expect(refundRes.status).toBe(200);
      expect(refundRes.body.payment.status).toBe('refunded');
      expect(refundRes.body.payment.remainingRefundableAmountMinor).toBe(0);
    });

    it('rejects refund request that exceeds remaining refundable balance', async () => {
      const refundRes = await request(app)
        .post(`/api/payments/${capturedPaymentId}/refunds`)
        .set('Cookie', brandCookie)
        .send({
          amountMinor: 200000, // $2,000 exceeds $1,500
          reason: 'Excessive refund attempt'
        });

      expect(refundRes.status).toBe(400);
      expect(refundRes.body.error.code).toBe('REFUND_EXCEEDS_BALANCE');
    });

    it('rejects creator from initiating refunds', async () => {
      const refundRes = await request(app)
        .post(`/api/payments/${capturedPaymentId}/refunds`)
        .set('Cookie', creatorCookie)
        .send({
          amountMinor: 50000,
          reason: 'Unauthorized creator refund attempt'
        });

      expect(refundRes.status).toBe(403);
    });
  });

  describe('5. Project Workspace Payments & Ledger Summary View', () => {
    it('provides both brand and creator access to project financial summary with verified invariants', async () => {
      // 1. Creator and Brand both access GET /api/projects/:projectId/payments
      const brandFinancials = await request(app)
        .get(`/api/projects/${projectId}/payments`)
        .set('Cookie', brandCookie);

      expect(brandFinancials.status).toBe(200);
      expect(brandFinancials.body.financials.totalContractMinor).toBe(400000);
      expect(brandFinancials.body.financials.currency).toBe('USD');
      expect(brandFinancials.body.ledgerSummary.isInBalance).toBe(true);

      const creatorFinancials = await request(app)
        .get(`/api/projects/${projectId}/payments`)
        .set('Cookie', creatorCookie);

      expect(creatorFinancials.status).toBe(200);
      expect(creatorFinancials.body.financials.totalContractMajor).toBe(4000);

      // Unauthorized third party is blocked
      const otherRes = await request(app)
        .get(`/api/projects/${projectId}/payments`)
        .set('Cookie', otherBrandCookie);
      expect(otherRes.status).toBe(403);
    });
  });

  describe('6. Operational Reconciliation & Recovery', () => {
    it('reconciles payment state if gateway captured but internal state was interrupted', async () => {
      // Create an order in order_created state
      const orderRes = await request(app)
        .post(`/api/projects/${projectId}/payments/orders`)
        .set('Cookie', brandCookie)
        .send({ milestoneId: milestone2Id });

      const paymentId = orderRes.body.payment.id;
      const gatewayPaymentId = `pay_mock_reconcile_${Date.now()}`;

      // Simulate provider confirming payment was captured on gateway
      mockProvider.payments.set(gatewayPaymentId, {
        gatewayPaymentId,
        amountMinor: 250000,
        currency: 'USD',
        status: 'captured'
      });

      // Update payment record to simulate partial failure where gatewayPaymentId was set before crash
      await Payment.findByIdAndUpdate(paymentId, { gatewayPaymentId });

      // Run reconciliation
      const reconcileRes = await request(app)
        .post('/api/payments/reconcile')
        .set('Cookie', brandCookie)
        .send({ paymentId });

      expect(reconcileRes.status).toBe(200);
      expect(reconcileRes.body.payment.status).toBe('captured');
      expect(reconcileRes.body.ledgerSummary.isInBalance).toBe(true);
    });
  });
});
