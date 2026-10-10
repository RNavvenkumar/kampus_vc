import { Types } from 'mongoose';
import { FinancialLedgerEntry, IFinancialLedgerEntry } from '../models/FinancialLedgerEntry.js';

export interface RecordPaymentCapturedParams {
  projectId: Types.ObjectId | string;
  paymentId: Types.ObjectId | string;
  amountMinor: number;
  currency: string;
  description?: string;
}

export interface RecordRefundParams {
  projectId: Types.ObjectId | string;
  paymentId: Types.ObjectId | string;
  refundId: Types.ObjectId | string;
  amountMinor: number;
  currency: string;
  description?: string;
}

export class LedgerService {
  /**
   * Records balanced double-entry records when a brand payment is captured into escrow.
   * Entry 1: Debit brand_funds (source of funds)
   * Entry 2: Credit escrow_hold (funds secured for milestone release)
   */
  static async recordPaymentCaptured(params: RecordPaymentCapturedParams): Promise<IFinancialLedgerEntry[]> {
    const seq = Date.now();
    const pId = new Types.ObjectId(params.projectId);
    const payId = new Types.ObjectId(params.paymentId);
    const desc = params.description || `Payment captured into escrow hold (${params.currency} ${params.amountMinor / 100})`;

    const debitEntry = new FinancialLedgerEntry({
      entryReference: `LED-PAY-DR-${seq}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: pId,
      paymentId: payId,
      entryType: 'payment_captured',
      account: 'brand_funds',
      debitMinor: params.amountMinor,
      creditMinor: 0,
      currency: params.currency.toUpperCase(),
      description: desc,
      sequence: seq,
      immutable: true
    });

    const creditEntry = new FinancialLedgerEntry({
      entryReference: `LED-PAY-CR-${seq}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: pId,
      paymentId: payId,
      entryType: 'payment_captured',
      account: 'escrow_hold',
      debitMinor: 0,
      creditMinor: params.amountMinor,
      currency: params.currency.toUpperCase(),
      description: desc,
      sequence: seq + 1,
      immutable: true
    });

    await debitEntry.save();
    await creditEntry.save();

    return [debitEntry, creditEntry];
  }

  /**
   * Records balanced compensating double-entry records when a refund is processed.
   * Entry 1: Debit escrow_hold (releasing held funds)
   * Entry 2: Credit brand_funds (returning funds to brand)
   */
  static async recordRefundProcessed(params: RecordRefundParams): Promise<IFinancialLedgerEntry[]> {
    const seq = Date.now();
    const pId = new Types.ObjectId(params.projectId);
    const payId = new Types.ObjectId(params.paymentId);
    const refId = new Types.ObjectId(params.refundId);
    const desc = params.description || `Compensating refund entry (${params.currency} ${params.amountMinor / 100})`;

    const debitEntry = new FinancialLedgerEntry({
      entryReference: `LED-REF-DR-${seq}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: pId,
      paymentId: payId,
      refundId: refId,
      entryType: 'payment_refunded',
      account: 'escrow_hold',
      debitMinor: params.amountMinor,
      creditMinor: 0,
      currency: params.currency.toUpperCase(),
      description: desc,
      sequence: seq,
      immutable: true
    });

    const creditEntry = new FinancialLedgerEntry({
      entryReference: `LED-REF-CR-${seq}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: pId,
      paymentId: payId,
      refundId: refId,
      entryType: 'payment_refunded',
      account: 'brand_funds',
      debitMinor: 0,
      creditMinor: params.amountMinor,
      currency: params.currency.toUpperCase(),
      description: desc,
      sequence: seq + 1,
      immutable: true
    });

    await debitEntry.save();
    await creditEntry.save();

    return [debitEntry, creditEntry];
  }

  /**
   * Calculates the project's financial summary and verifies the double-entry invariant.
   */
  static async getProjectFinancialSummary(projectId: Types.ObjectId | string) {
    const pId = new Types.ObjectId(projectId);
    const entries = await FinancialLedgerEntry.find({ projectId: pId }).sort({ sequence: 1 });

    let totalDebitMinor = 0;
    let totalCreditMinor = 0;
    const accountBalances: Record<string, { debitMinor: number; creditMinor: number; netBalanceMinor: number }> = {
      brand_funds: { debitMinor: 0, creditMinor: 0, netBalanceMinor: 0 },
      escrow_hold: { debitMinor: 0, creditMinor: 0, netBalanceMinor: 0 },
      platform_revenue: { debitMinor: 0, creditMinor: 0, netBalanceMinor: 0 },
      creator_earnings: { debitMinor: 0, creditMinor: 0, netBalanceMinor: 0 }
    };

    for (const entry of entries) {
      totalDebitMinor += entry.debitMinor;
      totalCreditMinor += entry.creditMinor;

      if (!accountBalances[entry.account]) {
        accountBalances[entry.account] = { debitMinor: 0, creditMinor: 0, netBalanceMinor: 0 };
      }

      accountBalances[entry.account].debitMinor += entry.debitMinor;
      accountBalances[entry.account].creditMinor += entry.creditMinor;
      accountBalances[entry.account].netBalanceMinor =
        accountBalances[entry.account].creditMinor - accountBalances[entry.account].debitMinor;
    }

    const isInBalance = totalDebitMinor === totalCreditMinor;

    return {
      entries,
      totalDebitMinor,
      totalCreditMinor,
      isInBalance,
      accountBalances,
      heldInEscrowMinor: accountBalances.escrow_hold.netBalanceMinor
    };
  }
}
