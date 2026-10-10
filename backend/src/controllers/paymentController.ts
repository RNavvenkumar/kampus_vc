import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Project } from '../models/Project.js';
import { Payment } from '../models/Payment.js';
import { Refund } from '../models/Refund.js';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.js';
import { ProjectActivity } from '../models/ProjectActivity.js';
import { Notification } from '../models/Notification.js';
import { getPaymentProvider } from '../payments/paymentFactory.js';
import { LedgerService } from '../services/ledgerService.js';
import { toMinorUnits, toMajorUnits, isSupportedCurrency } from '../utils/currency.js';
import { env } from '../config/env.js';

export class PaymentController {
  /**
   * POST /api/projects/:projectId/payments/orders
   * Brand initiates payment order for a project milestone or full project amount
   */
  static async createPaymentOrder(req: Request, res: Response): Promise<void> {
    const projectId = (Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId) as string;
    const { milestoneId, idempotencyKey: customIdempotencyKey } = req.body;
    const userId = req.user?.id;

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ error: { code: 'INVALID_PROJECT_ID', message: 'Valid project ID is required' } });
      return;
    }

    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } });
      return;
    }

    // Only authorized brand participant can create payments
    if (project.brandId.toString() !== userId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the project brand can create payment orders' } });
      return;
    }

    if (project.status === 'cancelled') {
      res.status(400).json({ error: { code: 'PROJECT_CANCELLED', message: 'Cannot create payment for a cancelled project' } });
      return;
    }

    // Validate currency support
    if (!isSupportedCurrency(project.currency)) {
      res.status(400).json({
        error: {
          code: 'UNSUPPORTED_CURRENCY',
          message: `Currency ${project.currency} is not supported by payment gateway. Supported currencies: USD, INR, EUR, GBP, CAD, AUD, SGD, AED.`
        }
      });
      return;
    }

    let amountMajor: number;
    let paymentPurpose: 'milestone_payment' | 'full_project' = 'full_project';
    let targetMilestoneId: Types.ObjectId | undefined;
    let milestoneOrder: number | undefined;
    let milestoneTitle: string | undefined;

    if (milestoneId) {
      if (!Types.ObjectId.isValid(milestoneId)) {
        res.status(400).json({ error: { code: 'INVALID_MILESTONE_ID', message: 'Valid milestone ID required' } });
        return;
      }
      const mId = new Types.ObjectId(milestoneId);
      const milestone = project.milestones.find((m) => m._id && m._id.toString() === mId.toString());
      if (!milestone) {
        res.status(404).json({ error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found in this project' } });
        return;
      }

      // Check if milestone has an amount
      if (!milestone.amount || milestone.amount <= 0) {
        res.status(400).json({ error: { code: 'INVALID_MILESTONE_AMOUNT', message: 'Milestone has no valid contract amount' } });
        return;
      }

      // Check if already paid and captured
      const existingCaptured = await Payment.findOne({
        projectId: project._id,
        milestoneId: mId,
        status: 'captured'
      });
      if (existingCaptured) {
        res.status(400).json({
          error: {
            code: 'MILESTONE_ALREADY_PAID',
            message: 'This milestone has already been paid and captured into escrow hold.'
          }
        });
        return;
      }

      amountMajor = milestone.amount;
      paymentPurpose = 'milestone_payment';
      targetMilestoneId = mId;
      milestoneOrder = milestone.order;
      milestoneTitle = milestone.title;
    } else {
      // Full project payment check
      amountMajor = project.agreedPrice;
      const existingCaptured = await Payment.findOne({
        projectId: project._id,
        paymentPurpose: 'full_project',
        status: 'captured'
      });
      if (existingCaptured) {
        res.status(400).json({
          error: {
            code: 'PROJECT_ALREADY_PAID',
            message: 'Full project payment has already been captured.'
          }
        });
        return;
      }
    }

    const amountMinor = toMinorUnits(amountMajor, project.currency);
    const idempotencyKey =
      customIdempotencyKey ||
      `order_${projectId}_${targetMilestoneId || 'full'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Check for existing order with same idempotency key
    const existingOrder = await Payment.findOne({ idempotencyKey });
    if (existingOrder && existingOrder.gatewayOrderId) {
      res.status(200).json({
        payment: existingOrder,
        orderId: existingOrder.gatewayOrderId,
        amountMinor: existingOrder.amountMinor,
        currency: existingOrder.currency,
        keyId: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
      });
      return;
    }

    const paymentReference = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create real gateway order via provider
    const provider = getPaymentProvider();
    const gatewayOrder = await provider.createOrder({
      amountMinor,
      currency: project.currency,
      receipt: paymentReference,
      notes: {
        projectId: project.id,
        projectReference: project.projectReference,
        brandId: project.brandId.toString(),
        creatorId: project.creatorId.toString(),
        milestoneId: targetMilestoneId ? targetMilestoneId.toString() : 'full'
      }
    });

    const payment = new Payment({
      paymentReference,
      projectId: project._id,
      milestoneId: targetMilestoneId,
      brandId: project.brandId,
      creatorId: project.creatorId,
      amountMinor,
      currency: project.currency,
      paymentPurpose,
      milestoneOrder,
      milestoneTitle,
      gateway: provider.providerName,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      status: 'order_created',
      idempotencyKey,
      remainingRefundableAmountMinor: 0,
      receiptNumber: paymentReference,
      metadata: {
        projectReference: project.projectReference,
        projectTitle: project.title
      }
    });

    await payment.save();

    res.status(201).json({
      payment,
      orderId: gatewayOrder.gatewayOrderId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
    });
  }

  /**
   * POST /api/payments/verify
   * Brand submits checkout signature callback after user completes Razorpay Modal
   */
  static async verifyPayment(req: Request, res: Response): Promise<void> {
    const { paymentId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;
    const userId = req.user?.id;

    if (!paymentId || !gatewayOrderId || !gatewayPaymentId || !gatewaySignature) {
      res.status(400).json({
        error: {
          code: 'MISSING_PAYMENT_VERIFICATION_FIELDS',
          message: 'paymentId, gatewayOrderId, gatewayPaymentId, and gatewaySignature are required'
        }
      });
      return;
    }

    if (!Types.ObjectId.isValid(paymentId)) {
      res.status(400).json({ error: { code: 'INVALID_PAYMENT_ID', message: 'Invalid payment ID' } });
      return;
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' } });
      return;
    }

    // Verify brand ownership
    if (payment.brandId.toString() !== userId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to verify this payment' } });
      return;
    }

    // Verify order ID matches
    if (payment.gatewayOrderId !== gatewayOrderId) {
      res.status(400).json({
        error: { code: 'ORDER_MISMATCH', message: 'Submitted order ID does not match payment record' }
      });
      return;
    }

    // Idempotency: if already captured, return success immediately
    if (payment.status === 'captured') {
      const summary = await LedgerService.getProjectFinancialSummary(payment.projectId);
      res.status(200).json({
        message: 'Payment already verified and captured',
        payment,
        ledgerSummary: summary
      });
      return;
    }

    // Verify HMAC-SHA256 signature with provider
    const provider = getPaymentProvider();
    const isValid = provider.verifyCheckoutSignature({
      orderId: gatewayOrderId,
      paymentId: gatewayPaymentId,
      signature: gatewaySignature
    });

    if (!isValid) {
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = 'Invalid checkout signature verification';
      await payment.save();

      res.status(400).json({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Payment signature verification failed. The transaction cannot be verified.'
        }
      });
      return;
    }

    // Transition payment to captured state
    payment.status = 'captured';
    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature;
    payment.capturedAmountMinor = payment.amountMinor;
    payment.remainingRefundableAmountMinor = payment.amountMinor;
    payment.capturedAt = new Date();
    await payment.save();

    // Update project status to in_progress if currently ready_for_kickoff
    const project = await Project.findById(payment.projectId);
    if (project && project.status === 'ready_for_kickoff') {
      project.status = 'in_progress';
      await project.save();
    }

    // Record immutable balanced double-entry ledger records
    await LedgerService.recordPaymentCaptured({
      projectId: payment.projectId,
      paymentId: payment._id,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      description: `Payment captured: ${payment.milestoneTitle || 'Project Escrow'} (${payment.currency} ${payment.amountMinor / 100})`
    });

    // Create project activity audit entry
    await ProjectActivity.create({
      projectId: payment.projectId,
      actorId: payment.brandId,
      actorRole: 'brand',
      eventType: 'payment_deposited',
      title: 'Milestone Payment Deposited',
      description: `Brand deposited ${payment.currency} ${(payment.amountMinor / 100).toFixed(2)} into escrow for ${payment.milestoneTitle || 'project deliverables'}.`,
      metadata: {
        paymentId: payment._id,
        paymentReference: payment.paymentReference,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        milestoneTitle: payment.milestoneTitle
      }
    });

    // Notify creator of incoming escrow deposit
    await Notification.create({
      recipientId: payment.creatorId,
      type: 'payment_captured',
      title: 'Payment Secured in Escrow',
      message: `The brand has deposited ${payment.currency} ${(payment.amountMinor / 100).toFixed(2)} into escrow for ${payment.milestoneTitle || 'the project'}.`,
      projectId: payment.projectId,
      paymentId: payment._id
    });

    const summary = await LedgerService.getProjectFinancialSummary(payment.projectId);

    res.status(200).json({
      message: 'Payment verified and secured in escrow',
      payment,
      ledgerSummary: summary
    });
  }

  /**
   * POST /api/payments/webhook
   * Public Webhook endpoint for Razorpay real-time asynchronous event processing
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (!signature) {
      res.status(400).json({ error: 'Missing webhook signature header' });
      return;
    }

    const provider = getPaymentProvider();
    const isValid = provider.verifyWebhookSignature({
      rawBody,
      signature
    });

    if (!isValid) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const eventPayload = req.body;
    const eventId = eventPayload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const eventType = eventPayload.event || 'unknown';

    // Idempotency: prevent double-processing same webhook event
    const existingEvent = await PaymentWebhookEvent.findOne({ eventId });
    if (existingEvent && existingEvent.processed) {
      res.status(200).json({ status: 'already_processed', eventId });
      return;
    }

    const webhookRecord =
      existingEvent ||
      new PaymentWebhookEvent({
        eventId,
        eventType,
        gateway: 'razorpay',
        payload: eventPayload,
        signature,
        receivedAt: new Date()
      });

    try {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        const gatewayOrderId = paymentEntity?.order_id;
        const gatewayPaymentId = paymentEntity?.id;

        if (gatewayOrderId) {
          const payment = await Payment.findOne({ gatewayOrderId });
          if (payment && payment.status !== 'captured') {
            payment.status = 'captured';
            payment.gatewayPaymentId = gatewayPaymentId || payment.gatewayPaymentId;
            payment.capturedAmountMinor = payment.amountMinor;
            payment.remainingRefundableAmountMinor = payment.amountMinor;
            payment.capturedAt = new Date();
            await payment.save();

            // Record ledger entries
            await LedgerService.recordPaymentCaptured({
              projectId: payment.projectId,
              paymentId: payment._id,
              amountMinor: payment.amountMinor,
              currency: payment.currency
            });
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = eventPayload.payload?.payment?.entity;
        const gatewayOrderId = paymentEntity?.order_id;
        if (gatewayOrderId) {
          const payment = await Payment.findOne({ gatewayOrderId });
          if (payment && payment.status !== 'captured') {
            payment.status = 'failed';
            payment.failedAt = new Date();
            payment.failureReason = paymentEntity?.error_description || 'Payment failed via webhook notification';
            await payment.save();
          }
        }
      }

      webhookRecord.processed = true;
      webhookRecord.processedAt = new Date();
      await webhookRecord.save();

      res.status(200).json({ status: 'success', eventId });
    } catch (err: any) {
      webhookRecord.processingError = err?.message || 'Unknown processing error';
      await webhookRecord.save();
      res.status(500).json({ error: 'Webhook processing error', details: err?.message });
    }
  }

  /**
   * GET /api/projects/:projectId/payments
   * Returns project payment records, refunds, and financial ledger summary
   */
  static async getProjectPayments(req: Request, res: Response): Promise<void> {
    const projectId = (Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId) as string;
    const userId = req.user?.id;

    if (!projectId || !Types.ObjectId.isValid(projectId)) {
      res.status(400).json({ error: { code: 'INVALID_PROJECT_ID', message: 'Valid project ID is required' } });
      return;
    }

    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } });
      return;
    }

    // Verify caller is an authorized project participant (brand or creator) or admin
    const isBrand = project.brandId.toString() === userId;
    const isCreator = project.creatorId.toString() === userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isBrand && !isCreator && !isAdmin) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to view project financials' } });
      return;
    }

    const payments = await Payment.find({ projectId: project._id }).sort({ createdAt: -1 });
    const refunds = await Refund.find({ projectId: project._id }).sort({ createdAt: -1 });
    const ledgerSummary = await LedgerService.getProjectFinancialSummary(project._id);

    const totalContractMinor = toMinorUnits(project.agreedPrice, project.currency);
    const totalCapturedMinor = payments
      .filter((p) => p.status === 'captured' || p.status === 'partially_refunded' || p.status === 'refunded')
      .reduce((sum, p) => sum + p.capturedAmountMinor, 0);
    const totalRefundedMinor = refunds
      .filter((r) => r.status === 'processed')
      .reduce((sum, r) => sum + r.amountMinor, 0);

    const heldInEscrowMinor = Math.max(0, totalCapturedMinor - totalRefundedMinor);
    const remainingPayableMinor = Math.max(0, totalContractMinor - totalCapturedMinor);

    res.status(200).json({
      payments,
      refunds,
      ledgerSummary,
      financials: {
        currency: project.currency,
        totalContractMinor,
        totalContractMajor: project.agreedPrice,
        totalCapturedMinor,
        totalCapturedMajor: toMajorUnits(totalCapturedMinor, project.currency),
        totalRefundedMinor,
        totalRefundedMajor: toMajorUnits(totalRefundedMinor, project.currency),
        heldInEscrowMinor,
        heldInEscrowMajor: toMajorUnits(heldInEscrowMinor, project.currency),
        remainingPayableMinor,
        remainingPayableMajor: toMajorUnits(remainingPayableMinor, project.currency)
      }
    });
  }

  /**
   * POST /api/payments/:paymentId/refunds
   * Brand or Admin initiates a full or partial refund on a captured payment
   */
  static async createRefund(req: Request, res: Response): Promise<void> {
    const paymentId = (Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId) as string;
    const { amountMinor: customAmountMinor, reason, idempotencyKey: customIdempotencyKey } = req.body;
    const userId = req.user?.id;

    if (!paymentId || !Types.ObjectId.isValid(paymentId)) {
      res.status(400).json({ error: { code: 'INVALID_PAYMENT_ID', message: 'Valid payment ID is required' } });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({ error: { code: 'REASON_REQUIRED', message: 'A clear reason for the refund is required' } });
      return;
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' } });
      return;
    }

    // Verify brand ownership or admin
    const isBrand = payment.brandId.toString() === userId;
    const isAdmin = req.user?.role === 'admin';
    if (!isBrand && !isAdmin) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to initiate refund for this payment' } });
      return;
    }

    if (payment.status !== 'captured' && payment.status !== 'partially_refunded') {
      res.status(400).json({
        error: {
          code: 'PAYMENT_NOT_REFUNDABLE',
          message: `Payment with status '${payment.status}' is not eligible for refund.`
        }
      });
      return;
    }

    const refundAmountMinor = customAmountMinor || payment.remainingRefundableAmountMinor;

    if (typeof refundAmountMinor !== 'number' || refundAmountMinor <= 0) {
      res.status(400).json({ error: { code: 'INVALID_REFUND_AMOUNT', message: 'Refund amount must be greater than zero' } });
      return;
    }

    if (refundAmountMinor > payment.remainingRefundableAmountMinor) {
      res.status(400).json({
        error: {
          code: 'REFUND_EXCEEDS_BALANCE',
          message: `Requested refund of ${refundAmountMinor} minor units exceeds remaining refundable balance of ${payment.remainingRefundableAmountMinor}.`
        }
      });
      return;
    }

    const idempotencyKey =
      customIdempotencyKey ||
      `refund_${payment._id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Check existing refund with idempotency key
    const existingRefund = await Refund.findOne({ idempotencyKey });
    if (existingRefund) {
      res.status(200).json({
        message: 'Refund request already processed',
        refund: existingRefund,
        payment
      });
      return;
    }

    const refundReference = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Execute refund via provider
    const provider = getPaymentProvider();
    let refundResult;
    try {
      refundResult = await provider.createRefund({
        paymentId: payment.gatewayPaymentId || payment.gatewayOrderId || 'pay_placeholder',
        amountMinor: refundAmountMinor,
        receipt: refundReference,
        notes: { reason: reason.trim(), paymentReference: payment.paymentReference }
      });
    } catch (err: any) {
      res.status(502).json({
        error: {
          code: 'GATEWAY_REFUND_FAILED',
          message: err?.message || 'Payment gateway rejected the refund request.'
        }
      });
      return;
    }

    const refund = new Refund({
      refundReference,
      paymentId: payment._id,
      projectId: payment.projectId,
      brandId: payment.brandId,
      amountMinor: refundAmountMinor,
      currency: payment.currency,
      reason: reason.trim(),
      gatewayRefundId: refundResult.gatewayRefundId,
      status: 'processed',
      gatewayResponse: refundResult,
      idempotencyKey,
      processedAt: new Date()
    });

    await refund.save();

    // Update payment record balances
    payment.refundedAmountMinor += refundAmountMinor;
    payment.remainingRefundableAmountMinor -= refundAmountMinor;
    payment.status = payment.remainingRefundableAmountMinor === 0 ? 'refunded' : 'partially_refunded';
    await payment.save();

    // Record compensating ledger entry
    await LedgerService.recordRefundProcessed({
      projectId: payment.projectId,
      paymentId: payment._id,
      refundId: refund._id,
      amountMinor: refundAmountMinor,
      currency: payment.currency,
      description: `Refund processed: ${reason.trim()} (${payment.currency} ${refundAmountMinor / 100})`
    });

    // Notify brand and creator
    await Notification.create({
      recipientId: payment.creatorId,
      type: 'refund_processed',
      title: 'Refund Processed',
      message: `A refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} was processed for project ${payment.paymentReference}.`,
      projectId: payment.projectId,
      paymentId: payment._id
    });

    res.status(200).json({
      message: 'Refund successfully processed',
      refund,
      payment
    });
  }

  /**
   * GET /api/payments/:paymentId/refunds
   * Returns list of refunds for a specific payment
   */
  static async getPaymentRefunds(req: Request, res: Response): Promise<void> {
    const paymentId = (Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId) as string;
    const userId = req.user?.id;

    if (!paymentId || !Types.ObjectId.isValid(paymentId)) {
      res.status(400).json({ error: { code: 'INVALID_PAYMENT_ID', message: 'Valid payment ID is required' } });
      return;
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' } });
      return;
    }

    const isParticipant =
      payment.brandId.toString() === userId || payment.creatorId.toString() === userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isParticipant && !isAdmin) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to view refunds for this payment' } });
      return;
    }

    const refunds = await Refund.find({ paymentId: payment._id }).sort({ createdAt: -1 });
    res.status(200).json({ refunds });
  }

  /**
   * POST /api/payments/reconcile
   * Reconciles gateway payment status against internal database
   */
  static async reconcilePayment(req: Request, res: Response): Promise<void> {
    const { paymentId } = req.body;
    const userId = req.user?.id;

    if (!paymentId || !Types.ObjectId.isValid(paymentId)) {
      res.status(400).json({ error: { code: 'INVALID_PAYMENT_ID', message: 'Valid payment ID is required' } });
      return;
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' } });
      return;
    }

    const isBrand = payment.brandId.toString() === userId;
    const isAdmin = req.user?.role === 'admin';
    if (!isBrand && !isAdmin) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized to reconcile this payment' } });
      return;
    }

    if (!payment.gatewayPaymentId && !payment.gatewayOrderId) {
      res.status(400).json({ error: { code: 'NO_GATEWAY_REFERENCE', message: 'Payment has no gateway reference to reconcile' } });
      return;
    }

    const provider = getPaymentProvider();
    const gatewayData = await provider.fetchPayment(payment.gatewayPaymentId || payment.gatewayOrderId!);

    let updated = false;
    if (gatewayData.status === 'captured' && payment.status !== 'captured') {
      payment.status = 'captured';
      payment.capturedAmountMinor = gatewayData.amountMinor || payment.amountMinor;
      payment.remainingRefundableAmountMinor = payment.capturedAmountMinor;
      payment.capturedAt = new Date();
      await payment.save();

      await LedgerService.recordPaymentCaptured({
        projectId: payment.projectId,
        paymentId: payment._id,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        description: 'Payment reconciled via gateway status check'
      });
      updated = true;
    }

    const ledgerSummary = await LedgerService.getProjectFinancialSummary(payment.projectId);

    res.status(200).json({
      message: updated ? 'Payment reconciled and updated to captured state' : 'Payment state is already consistent with gateway',
      payment,
      gatewayData,
      ledgerSummary
    });
  }
}
