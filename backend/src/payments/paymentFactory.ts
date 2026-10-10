import { IPaymentProvider } from './paymentInterface.js';
import { RazorpayProvider } from './razorpayProvider.js';
import { MockPaymentProvider } from './mockPaymentProvider.js';
import { env } from '../config/env.js';

let activeProvider: IPaymentProvider | null = null;

export function getPaymentProvider(): IPaymentProvider {
  if (activeProvider) {
    return activeProvider;
  }

  // If Razorpay keys are configured and provider is razorpay, use RazorpayProvider
  if (env.PAYMENT_PROVIDER === 'razorpay' && env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    activeProvider = new RazorpayProvider(
      env.RAZORPAY_KEY_ID,
      env.RAZORPAY_KEY_SECRET
    );
  } else {
    // Default fallback to MockPaymentProvider for testing / missing credentials
    activeProvider = new MockPaymentProvider();
  }

  return activeProvider;
}

export function setPaymentProviderForTesting(provider: IPaymentProvider | null): void {
  activeProvider = provider;
}
