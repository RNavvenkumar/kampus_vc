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

export class MockPaymentProvider implements IPaymentProvider {
  readonly providerName = 'mock';
  public mockSecret = 'mock_secret_key_for_testing_12345';
  public mockWebhookSecret = 'mock_webhook_secret_key_12345';

  public orders: Map<string, CreateOrderResult> = new Map();
  public payments: Map<string, FetchPaymentResult> = new Map();
  public refunds: Map<string, RefundResult> = new Map();

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const result: CreateOrderResult = {
      gatewayOrderId: orderId,
      amountMinor: params.amountMinor,
      currency: params.currency.toUpperCase(),
      status: 'created',
      receipt: params.receipt
    };
    this.orders.set(orderId, result);
    return result;
  }

  generateValidSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.mockSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  generateValidWebhookSignature(rawBody: string | Buffer): string {
    return crypto
      .createHmac('sha256', this.mockWebhookSecret)
      .update(rawBody)
      .digest('hex');
  }

  verifyCheckoutSignature(params: VerifyCheckoutParams): boolean {
    if (!params.orderId || !params.paymentId || !params.signature) {
      return false;
    }
    const expected = this.generateValidSignature(params.orderId, params.paymentId);
    return expected === params.signature;
  }

  verifyWebhookSignature(params: VerifyWebhookParams): boolean {
    if (!params.rawBody || !params.signature) {
      return false;
    }
    const secret = params.secret || this.mockWebhookSecret;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(params.rawBody)
      .digest('hex');
    return expected === params.signature;
  }

  async fetchPayment(gatewayPaymentId: string): Promise<FetchPaymentResult> {
    if (this.payments.has(gatewayPaymentId)) {
      return this.payments.get(gatewayPaymentId)!;
    }
    return {
      gatewayPaymentId,
      gatewayOrderId: `order_mock_${Date.now()}`,
      amountMinor: 10000,
      currency: 'USD',
      status: 'captured'
    };
  }

  async createRefund(params: CreateRefundParams): Promise<RefundResult> {
    const refundId = `rfnd_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const result: RefundResult = {
      gatewayRefundId: refundId,
      gatewayPaymentId: params.paymentId,
      amountMinor: params.amountMinor,
      currency: 'USD',
      status: 'processed'
    };
    this.refunds.set(refundId, result);
    return result;
  }
}
