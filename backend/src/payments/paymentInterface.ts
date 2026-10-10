export interface CreateOrderParams {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  gatewayOrderId: string;
  amountMinor: number;
  currency: string;
  status: string;
  receipt: string;
}

export interface VerifyCheckoutParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyWebhookParams {
  rawBody: string | Buffer;
  signature: string;
  secret?: string;
}

export interface FetchPaymentResult {
  gatewayPaymentId: string;
  gatewayOrderId?: string;
  amountMinor: number;
  currency: string;
  status: string; // 'captured', 'authorized', 'failed', 'refunded'
  method?: string;
  email?: string;
  contact?: string;
  errorDescription?: string;
}

export interface CreateRefundParams {
  paymentId: string; // Gateway payment ID (e.g. pay_...)
  amountMinor: number;
  notes?: Record<string, string>;
  receipt?: string;
}

export interface RefundResult {
  gatewayRefundId: string;
  gatewayPaymentId: string;
  amountMinor: number;
  currency: string;
  status: string; // 'processed', 'pending', 'failed'
}

export interface IPaymentProvider {
  readonly providerName: string;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  verifyCheckoutSignature(params: VerifyCheckoutParams): boolean;
  verifyWebhookSignature(params: VerifyWebhookParams): boolean;
  fetchPayment(gatewayPaymentId: string): Promise<FetchPaymentResult>;
  createRefund(params: CreateRefundParams): Promise<RefundResult>;
}
