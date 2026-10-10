import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type LedgerEntryType =
  | 'payment_captured'
  | 'payment_refunded'
  | 'platform_fee'
  | 'creator_payable'
  | 'creator_payout'
  | 'adjustment';

export type LedgerAccount =
  | 'brand_funds'
  | 'escrow_hold'
  | 'platform_revenue'
  | 'creator_earnings';

export interface IFinancialLedgerEntry extends Document {
  entryReference: string;
  projectId: Types.ObjectId;
  paymentId?: Types.ObjectId;
  refundId?: Types.ObjectId;
  entryType: LedgerEntryType;
  account: LedgerAccount;
  debitMinor: number;
  creditMinor: number;
  currency: string;
  description: string;
  immutable: boolean;
  sequence: number;
  createdAt: Date;
}

const financialLedgerEntrySchema = new Schema<IFinancialLedgerEntry>(
  {
    entryReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      index: true
    },
    refundId: {
      type: Schema.Types.ObjectId,
      ref: 'Refund',
      index: true
    },
    entryType: {
      type: String,
      enum: [
        'payment_captured',
        'payment_refunded',
        'platform_fee',
        'creator_payable',
        'creator_payout',
        'adjustment'
      ],
      required: true,
      index: true
    },
    account: {
      type: String,
      enum: ['brand_funds', 'escrow_hold', 'platform_revenue', 'creator_earnings'],
      required: true,
      index: true
    },
    debitMinor: {
      type: Number,
      default: 0,
      min: 0
    },
    creditMinor: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    immutable: {
      type: Boolean,
      default: true
    },
    sequence: {
      type: Number,
      required: true,
      default: () => Date.now()
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        ret.id = ret._id?.toString() || ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

// Prevent mutating existing ledger entries in Mongoose middleware
financialLedgerEntrySchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) {
  next(new Error('Financial ledger entries are strictly immutable and cannot be updated.'));
});

financialLedgerEntrySchema.index({ projectId: 1, sequence: 1 });
financialLedgerEntrySchema.index({ account: 1, createdAt: -1 });

export const FinancialLedgerEntry: Model<IFinancialLedgerEntry> =
  mongoose.models.FinancialLedgerEntry ||
  mongoose.model<IFinancialLedgerEntry>('FinancialLedgerEntry', financialLedgerEntrySchema);
