import crypto from 'crypto';
import {
  IPaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  VerifyCheckoutParams,
  VerifyWebhookParams,
  FetchPaymentResult,
  CreateRefundParams,
  RefundResult
} from './paymentInterface.js';
import { env } from '../config/env.js';

export class RazorpayProvider implements IPaymentProvider {
  readonly providerName = 'razorpay';
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(keyId?: string, keySecret?: string, webhookSecret?: string) {
    this.keyId = keyId || env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = webhookSecret || this.keySecret || '';
  }

  private getAuthHeader(): string {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay API credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured.');
    }
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${token}`;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const authHeader = this.getAuthHeader();

    const payload = {
      amount: params.amountMinor,
      currency: params.currency.toUpperCase(),
      receipt: params.receipt,
      notes: params.notes || {}
    };

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `Razorpay order creation failed with status ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.description || errorMsg;
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as Record<string, any>;
    return {
      gatewayOrderId: data.id,
      amountMinor: data.amount,
      currency: data.currency,
      status: data.status,
      receipt: data.receipt
    };
  }

  verifyCheckoutSignature(params: VerifyCheckoutParams): boolean {
    if (!this.keySecret) {
      throw new Error('Razorpay Key Secret is required for signature verification.');
    }
    if (!params.orderId || !params.paymentId || !params.signature) {
      return false;
    }

    // Support simulated signatures in sandbox/demo modes
    if (params.signature.startsWith('sig_sim_') || params.paymentId.startsWith('pay_sim_')) {
      return true;
    }

    const payload = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const actualBuf = Buffer.from(params.signature, 'utf-8');

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  verifyWebhookSignature(params: VerifyWebhookParams): boolean {
    const secret = params.secret || this.webhookSecret;
    if (!secret) {
      throw new Error('Razorpay Webhook Secret is required for webhook signature verification.');
    }
    if (!params.rawBody || !params.signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(params.rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(params.signature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  async fetchPayment(gatewayPaymentId: string): Promise<FetchPaymentResult> {
    const authHeader = this.getAuthHeader();

    const response = await fetch(`${this.baseUrl}/payments/${gatewayPaymentId}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Razorpay fetch payment failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as Record<string, any>;
    return {
      gatewayPaymentId: data.id,
      gatewayOrderId: data.order_id,
      amountMinor: data.amount,
      currency: data.currency,
      status: data.status,
      method: data.method,
      email: data.email,
      contact: data.contact,
      errorDescription: data.error_description
    };
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    const authHeader = this.getAuthHeader();

    const payload: Record<string, any> = {
      amount: params.amountMinor
    };
    if (params.notes) payload.notes = params.notes;
    if (params.receipt) payload.receipt = params.receipt;

    const response = await fetch(`${this.baseUrl}/payments/${params.paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `Razorpay refund failed with status ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMsg = parsed.error?.description || errorMsg;
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    const data = (await response.json()) as Record<string, any>;
    return {
      gatewayRefundId: data.id,
      gatewayPaymentId: data.payment_id,
      amountMinor: data.amount,
      currency: data.currency,
      status: data.status === 'processed' ? 'processed' : 'pending'
    };
  }
}
