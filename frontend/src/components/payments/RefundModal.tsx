import React, { useState } from 'react';
import { RefreshCw, AlertCircle, X, Loader2 } from 'lucide-react';
import { createRefund } from '../../services/api';
import { PaymentRecord, RefundRecord } from '../../types';

interface RefundModalProps {
  payment: PaymentRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (refund: RefundRecord) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  payment,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [refundAmountMajor, setRefundAmountMajor] = useState<number>(
    payment.remainingRefundableAmountMinor / 100
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const maxRefundMajor = payment.remainingRefundableAmountMinor / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the refund.');
      return;
    }

    if (refundAmountMajor <= 0 || refundAmountMajor > maxRefundMajor) {
      setError(`Refund amount must be between 1 and ${maxRefundMajor} ${payment.currency}.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const amountMinor = Math.round(refundAmountMajor * 100);

      const res = await createRefund(payment.id, {
        amountMinor,
        reason: reason.trim()
      });

      onSuccess(res.refund);
      onClose();
    } catch (err: any) {
      console.error('Refund processing failed:', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to process refund request. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Initiate Refund</h3>
              <p className="text-xs text-zinc-400">Return Escrow Funds to Brand</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-start gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Payment Reference:</span>
              <span className="font-mono text-zinc-200">{payment.paymentReference}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Remaining Refundable:</span>
              <span className="font-semibold text-cyan-400 font-mono">
                {payment.currency} {maxRefundMajor.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Refund Amount ({payment.currency})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                max={maxRefundMajor}
                value={refundAmountMajor}
                onChange={(e) => setRefundAmountMajor(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setRefundAmountMajor(maxRefundMajor)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40"
              >
                Max
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Reason for Refund
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scope adjustment agreed with creator, deliverable cancellation..."
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-sm border border-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Issue Refund
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
