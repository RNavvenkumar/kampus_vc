import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IInquiryContext {
  serviceTitle?: string;
  packageTier?: string;
  price?: number;
  currency?: string;
}

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  creatorProfileId?: Types.ObjectId;
  brandProfileId?: Types.ObjectId;
  inquiryContext?: IInquiryContext;
  lastMessage?: {
    content: string;
    senderId: Types.ObjectId;
    sentAt: Date;
  };
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    creatorProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'CreatorProfile'
    },
    brandProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BrandProfile'
    },
    inquiryContext: {
      serviceTitle: { type: String, trim: true },
      packageTier: { type: String, trim: true },
      price: { type: Number },
      currency: { type: String, default: 'INR' }
    },
    lastMessage: {
      content: { type: String, trim: true },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      sentAt: { type: Date, default: Date.now }
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
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

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);
