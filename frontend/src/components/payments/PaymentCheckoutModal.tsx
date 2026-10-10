import React, { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  X,
  Lock,
  Loader2
} from 'lucide-react';
import { createPaymentOrder, verifyPayment } from '../../services/api';
import { Project, ProjectMilestone, PaymentRecord } from '../../types';

interface PaymentCheckoutModalProps {
  project: Project;
  milestone?: ProjectMilestone | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payment: PaymentRecord) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  project,
  milestone,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'review' | 'processing' | 'success'>('review');
  const [completedPayment, setCompletedPayment] = useState<PaymentRecord | null>(null);

  if (!isOpen) return null;

  const payableAmountMajor = milestone?.amount || project.agreedPrice;
  const currency = project.currency || 'INR';
  const purposeTitle = milestone
    ? `Milestone ${milestone.order}: ${milestone.title}`
    : `Full Contract Escrow Deposit (${project.title})`;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleInitiatePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Create order on backend
      const orderData = await createPaymentOrder(project.id, milestone?._id?.toString());

      // 2. Try loading official Razorpay Checkout SDK
      const isScriptLoaded = await loadRazorpayScript();

      if (isScriptLoaded && window.Razorpay && orderData.keyId && orderData.keyId.startsWith('rzp_')) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountMinor,
          currency: orderData.currency,
          name: 'Kampus.VC Escrow',
          description: purposeTitle,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              setPaymentStep('processing');
              const verifyRes = await verifyPayment({
                paymentId: orderData.payment.id,
                gatewayOrderId: response.razorpay_order_id || orderData.orderId,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewaySignature: response.razorpay_signature
              });
              setCompletedPayment(verifyRes.payment);
              setPaymentStep('success');
              onSuccess(verifyRes.payment);
            } catch (err: any) {
              setError(err.response?.data?.error?.message || 'Payment signature verification failed.');
              setPaymentStep('review');
            }
          },
          prefill: {
            name: 'Brand Client'
          },
          theme: {
            color: '#06b6d4'
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      } else {
        // Controlled Sandbox / Test Verification Mode
        setPaymentStep('processing');
        const mockPaymentId = `pay_sim_${Date.now()}`;
        const mockSignature = `sig_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const verifyRes = await verifyPayment({
          paymentId: orderData.payment.id,
          gatewayOrderId: orderData.orderId,
          gatewayPaymentId: mockPaymentId,
          gatewaySignature: mockSignature
        });

        setCompletedPayment(verifyRes.payment);
        setPaymentStep('success');
        onSuccess(verifyRes.payment);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Payment checkout error:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to initialize payment checkout. Please try again.'
      );
      setLoading(false);
      setPaymentStep('review');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Secure Escrow Checkout</h3>
              <p className="text-xs text-zinc-400">Razorpay Encrypted Payment Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={paymentStep === 'processing'}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {paymentStep === 'review' && (
            <div className="space-y-5">
              {/* Payment Summary Box */}
              <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs text-zinc-400">
                  <span>Project Reference</span>
                  <span className="font-mono text-zinc-300">{project.projectReference}</span>
                </div>
                <div className="flex justify-between items-start text-xs text-zinc-400">
                  <span>Payment Objective</span>
                  <span className="font-medium text-zinc-200 text-right max-w-[240px] truncate">
                    {purposeTitle}
                  </span>
                </div>
                <div className="border-t border-zinc-800/80 pt-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-300">Total Payable</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-cyan-400 font-mono">
                      {currency} {payableAmountMajor.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-zinc-400">Funds held securely in escrow</span>
                  </div>
                </div>
              </div>

              {/* Escrow Guarantee Banner */}
              <div className="p-3.5 bg-cyan-950/20 border border-cyan-800/30 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 space-y-1">
                  <p className="font-medium text-cyan-300">100% Escrow Protection Guarantee</p>
                  <p className="text-zinc-400 leading-relaxed">
                    Your payment remains locked in Kampus.VC escrow until you review and approve the creator's deliverables.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-sm border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInitiatePayment}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded-xl text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting Gateway...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Deposit {currency} {payableAmountMajor.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {paymentStep === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-zinc-100">Verifying Cryptographic Signature</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Validating Razorpay HMAC-SHA256 signature and recording immutable financial ledger entries...
                </p>
              </div>
            </div>
          )}

          {paymentStep === 'success' && completedPayment && (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-zinc-100">Payment Secured in Escrow</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Transaction verified and captured. The creator has been notified to proceed.
                </p>
              </div>

              {/* Receipt Snippet */}
              <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Reference:</span>
                  <span className="text-zinc-200">{completedPayment.paymentReference}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Amount Deposited:</span>
                  <span className="text-emerald-400 font-semibold">
                    {completedPayment.currency} {(completedPayment.capturedAmountMinor / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Escrow Status:</span>
                  <span className="text-cyan-400 font-semibold capitalize">{completedPayment.status}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-xl text-sm transition-colors"
              >
                Back to Workspace
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
