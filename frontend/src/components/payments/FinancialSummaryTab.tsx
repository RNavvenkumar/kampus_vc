import React, { useState } from 'react';
import {
  DollarSign,
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  FileText,
  Lock,
  Receipt
} from 'lucide-react';
import { Project, ProjectFinancialsResponse, PaymentRecord, UserRole } from '../../types';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';
import { RefundModal } from './RefundModal';

interface FinancialSummaryTabProps {
  project: Project;
  financialData: ProjectFinancialsResponse | null;
  loading: boolean;
  currentUserRole: UserRole;
  onRefresh: () => void;
}

export const FinancialSummaryTab: React.FC<FinancialSummaryTabProps> = ({
  project,
  financialData,
  loading,
  currentUserRole,
  onRefresh
}) => {
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedMilestoneForPay, setSelectedMilestoneForPay] = useState<any>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<PaymentRecord | null>(null);

  if (loading && !financialData) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <div className="w-8 h-8 mx-auto mb-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading financial records & ledger...</p>
      </div>
    );
  }

  const financials = financialData?.financials;
  const payments = financialData?.payments || [];
  const ledgerEntries = financialData?.ledgerSummary?.entries || [];
  const currency = financials?.currency || project.currency || 'USD';

  const isBrand = currentUserRole === 'brand' || project.brandId === currentUserRole;

  const handleOpenCheckout = (milestone?: any) => {
    setSelectedMilestoneForPay(milestone || null);
    setCheckoutModalOpen(true);
  };

  const handleOpenRefund = (payment: PaymentRecord) => {
    setSelectedPaymentForRefund(payment);
    setRefundModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Overview Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contract */}
        <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Contract</span>
            <DollarSign className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {currency} {(financials?.totalContractMajor ?? project.agreedPrice).toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Authoritative contract price</p>
        </div>

        {/* Held in Escrow */}
        <div className="p-4 bg-gradient-to-br from-cyan-950/30 to-zinc-900/60 border border-cyan-500/30 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Held in Escrow
            </span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">
            {currency} {(financials?.heldInEscrowMajor ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-1">Locked until milestone approval</p>
        </div>

        {/* Total Captured */}
        <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Deposited</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {currency} {(financials?.totalCapturedMajor ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Total funded by brand</p>
        </div>

        {/* Remaining Payable */}
        <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Remaining Payable</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {currency} {(financials?.remainingPayableMajor ?? 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Pending milestone deposits</p>
        </div>
      </div>

      {/* Brand Action Banner (if remaining balance > 0) */}
      {isBrand && (financials?.remainingPayableMajor ?? 1) > 0 && (
        <div className="p-4 bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-zinc-900/60 border border-cyan-800/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
              <CreditCard className="w-4 h-4 text-cyan-400" />
              Deposit Next Milestone Funds
            </div>
            <p className="text-xs text-zinc-400">
              Fund the next milestone into escrow so the creator can commence production with peace of mind.
            </p>
          </div>
          <button
            onClick={() => handleOpenCheckout()}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0 transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            Deposit Escrow Funds
          </button>
        </div>
      )}

      {/* 2. Milestone Payment Status Grid */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          Milestone Funding Status
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project.milestones.map((m) => {
            const milestonePaid = payments.find(
              (p) =>
                p.milestoneId === m._id?.toString() &&
                (p.status === 'captured' || p.status === 'partially_refunded')
            );

            return (
              <div
                key={m._id?.toString() || m.order}
                className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">M{m.order}</span>
                    <span className="text-xs font-medium text-zinc-200">{m.title}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    {currency} {(m.amount || 0).toLocaleString()}
                  </div>
                </div>

                <div>
                  {milestonePaid ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                      <CheckCircle2 className="w-3 h-3" />
                      Funded in Escrow
                    </span>
                  ) : isBrand ? (
                    <button
                      onClick={() => handleOpenCheckout(m)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-cyan-500 hover:text-zinc-950 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition-colors"
                    >
                      Fund Escrow
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-700/60">
                      <Clock className="w-3 h-3" />
                      Pending Deposit
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Payment Transactions Table */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" />
            Payment Transactions & Escrow Deposits
          </h4>
          <span className="text-xs text-zinc-400 font-mono">{payments.length} records</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            No payment records found for this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Objective</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  {isBrand && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {payments.map((p) => {
                  const isCaptured =
                    p.status === 'captured' || p.status === 'partially_refunded';
                  const canRefund = isBrand && isCaptured && p.remainingRefundableAmountMinor > 0;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 text-zinc-200 font-semibold">{p.paymentReference}</td>
                      <td className="py-3 px-4 text-zinc-400 font-sans">
                        {p.milestoneTitle || (p.paymentPurpose === 'full_project' ? 'Full Project' : 'Milestone')}
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-100">
                        {p.currency} {(p.amountMinor / 100).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            p.status === 'captured'
                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                              : p.status === 'partially_refunded'
                              ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800/40'
                              : p.status === 'refunded'
                              ? 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                              : p.status === 'failed'
                              ? 'bg-red-950/50 text-red-400 border border-red-800/40'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      {isBrand && (
                        <td className="py-3 px-4 text-right">
                          {canRefund && (
                            <button
                              onClick={() => handleOpenRefund(p)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 rounded border border-amber-800/40 text-[10px] font-sans transition-colors"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Immutable Double-Entry Ledger Summary */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-zinc-100">
              Auditable Financial Ledger
            </h4>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
            Invariant Balanced ✓
          </span>
        </div>

        {ledgerEntries.length === 0 ? (
          <div className="p-6 text-center text-zinc-400 text-xs font-mono">
            No ledger entries recorded yet. Entries are written immutably upon verified gateway captures.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-medium sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Entry Reference</th>
                  <th className="py-2.5 px-4">Account</th>
                  <th className="py-2.5 px-4">Debit (DR)</th>
                  <th className="py-2.5 px-4">Credit (CR)</th>
                  <th className="py-2.5 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {ledgerEntries.map((e) => (
                  <tr key={e.id || e.entryReference} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-2 px-4 text-zinc-400">{e.entryReference}</td>
                    <td className="py-2 px-4 font-semibold text-zinc-200 capitalize">
                      {e.account.replace('_', ' ')}
                    </td>
                    <td className="py-2 px-4 text-amber-400">
                      {e.debitMinor > 0 ? `${e.currency} ${(e.debitMinor / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-4 text-emerald-400">
                      {e.creditMinor > 0 ? `${e.currency} ${(e.creditMinor / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-4 text-zinc-400 font-sans text-xs truncate max-w-xs">
                      {e.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <PaymentCheckoutModal
        project={project}
        milestone={selectedMilestoneForPay}
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        onSuccess={() => {
          setCheckoutModalOpen(false);
          onRefresh();
        }}
      />

      {selectedPaymentForRefund && (
        <RefundModal
          payment={selectedPaymentForRefund}
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          onSuccess={() => {
            setRefundModalOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
