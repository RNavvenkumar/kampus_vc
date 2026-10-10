import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

export const paymentRouter = Router();

// 1. Webhook endpoint (Public, HMAC-SHA256 signature verified inside controller)
paymentRouter.post('/webhook', PaymentController.handleWebhook);

// 2. Checkout Verification (Brand only)
paymentRouter.post('/verify', requireAuth, requireRole('brand'), PaymentController.verifyPayment);

// 3. Operational Reconciliation (Brand or Admin)
paymentRouter.post('/reconcile', requireAuth, PaymentController.reconcilePayment);

// 4. Refund Management
paymentRouter.post('/:paymentId/refunds', requireAuth, PaymentController.createRefund);
paymentRouter.get('/:paymentId/refunds', requireAuth, PaymentController.getPaymentRefunds);
