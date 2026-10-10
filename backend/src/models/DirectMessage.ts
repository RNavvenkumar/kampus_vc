import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IDirectMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  content: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
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

directMessageSchema.index({ conversationId: 1, createdAt: 1 });

export const DirectMessage: Model<IDirectMessage> =
  mongoose.models.DirectMessage || mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);
