import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type RefundStatus = 'pending' | 'processed' | 'failed';

export interface IRefund extends Document {
  refundReference: string;
  paymentId: Types.ObjectId;
  projectId: Types.ObjectId;
  brandId: Types.ObjectId;
  amountMinor: number;
  currency: string;
  reason: string;
  gatewayRefundId?: string;
  status: RefundStatus;
  gatewayResponse?: Record<string, any>;
  failureReason?: string;
  idempotencyKey: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    refundReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    brandId: {
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
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    gatewayRefundId: {
      type: String,
      sparse: true,
      index: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    gatewayResponse: {
      type: Schema.Types.Mixed
    },
    failureReason: {
      type: String,
      trim: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    processedAt: {
      type: Date
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

refundSchema.index({ paymentId: 1, createdAt: -1 });

export const Refund: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>('Refund', refundSchema);
