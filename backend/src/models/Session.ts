import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  sessionTokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isValid: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically removes expired sessions
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

sessionSchema.index({ userId: 1, isValid: 1 });

export const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);
