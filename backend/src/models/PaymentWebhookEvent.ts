import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPaymentWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  gateway: 'razorpay' | 'mock';
  payload: Record<string, any>;
  signature?: string;
  processed: boolean;
  processedAt?: Date;
  processingError?: string;
  receivedAt: Date;
}

const paymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'mock'],
      default: 'razorpay'
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    signature: {
      type: String,
      trim: true
    },
    processed: {
      type: Boolean,
      default: false,
      index: true
    },
    processedAt: {
      type: Date
    },
    processingError: {
      type: String
    },
    receivedAt: {
      type: Date,
      default: Date.now
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

paymentWebhookEventSchema.index({ receivedAt: -1 });

export const PaymentWebhookEvent: Model<IPaymentWebhookEvent> =
  mongoose.models.PaymentWebhookEvent ||
  mongoose.model<IPaymentWebhookEvent>('PaymentWebhookEvent', paymentWebhookEventSchema);
