import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type PaymentStatus =
  | 'created'
  | 'order_created'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type PaymentPurpose = 'full_project' | 'milestone_payment' | 'deposit' | 'custom';

export interface IPayment extends Document {
  paymentReference: string;
  projectId: Types.ObjectId;
  milestoneId?: Types.ObjectId;
  brandId: Types.ObjectId;
  creatorId: Types.ObjectId;
  amountMinor: number;
  currency: string;
  paymentPurpose: PaymentPurpose;
  milestoneOrder?: number;
  milestoneTitle?: string;
  gateway: 'razorpay' | 'mock';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  status: PaymentStatus;
  idempotencyKey: string;
  capturedAmountMinor: number;
  refundedAmountMinor: number;
  remainingRefundableAmountMinor: number;
  capturedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  receiptNumber?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    paymentReference: {
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
    milestoneId: {
      type: Schema.Types.ObjectId,
      index: true
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 1
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    paymentPurpose: {
      type: String,
      enum: ['full_project', 'milestone_payment', 'deposit', 'custom'],
      default: 'milestone_payment',
      required: true
    },
    milestoneOrder: {
      type: Number
    },
    milestoneTitle: {
      type: String,
      trim: true
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'mock'],
      default: 'razorpay'
    },
    gatewayOrderId: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },
    gatewayPaymentId: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },
    gatewaySignature: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: [
        'created',
        'order_created',
        'pending',
        'authorized',
        'captured',
        'failed',
        'cancelled',
        'refunded',
        'partially_refunded'
      ],
      default: 'created',
      index: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    capturedAmountMinor: {
      type: Number,
      default: 0,
      min: 0
    },
    refundedAmountMinor: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingRefundableAmountMinor: {
      type: Number,
      default: 0,
      min: 0
    },
    capturedAt: {
      type: Date
    },
    failedAt: {
      type: Date
    },
    failureReason: {
      type: String,
      trim: true
    },
    receiptNumber: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
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

// Compound indexes
paymentSchema.index({ projectId: 1, milestoneId: 1, status: 1 });
paymentSchema.index({ brandId: 1, createdAt: -1 });
paymentSchema.index({ creatorId: 1, createdAt: -1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
