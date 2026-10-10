import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type MediaCategory = 'image' | 'video';
export type MediaStatus = 'initiated' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'rejected';
export type MediaVisibility = 'public' | 'unlisted' | 'private';

export interface ILinkedEntity {
  entityType: 'portfolio' | 'project' | 'brand_brief';
  entityId: Types.ObjectId;
}

export interface IMediaAsset extends Document {
  userId: Types.ObjectId;
  storageProvider: 'local' | 's3' | 'cloudinary';
  objectKey: string;
  originalFilename: string;
  sanitizedFilename: string;
  mimeType: string;
  category: MediaCategory;
  fileSizeBytes: number;
  dimensions?: {
    width?: number;
    height?: number;
  };
  durationSeconds?: number;
  status: MediaStatus;
  visibility: MediaVisibility;
  failureReason?: string;
  checksumSha256?: string;
  linkedEntities: ILinkedEntity[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const linkedEntitySchema = new Schema<ILinkedEntity>(
  {
    entityType: {
      type: String,
      enum: ['portfolio', 'project', 'brand_brief'],
      required: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true
    }
  },
  { _id: false }
);

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'cloudinary'],
      required: true
    },
    objectKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    sanitizedFilename: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0
    },
    dimensions: {
      width: { type: Number },
      height: { type: Number }
    },
    durationSeconds: {
      type: Number
    },
    status: {
      type: String,
      enum: ['initiated', 'uploaded', 'processing', 'ready', 'failed', 'rejected'],
      default: 'initiated'
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'private'
    },
    failureReason: {
      type: String,
      trim: true
    },
    checksumSha256: {
      type: String,
      trim: true
    },
    linkedEntities: [linkedEntitySchema],
    expiresAt: {
      type: Date
    },
    metadata: {
      type: Schema.Types.Mixed
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

// Indexes
mediaAssetSchema.index({ userId: 1, createdAt: -1 });
mediaAssetSchema.index({ status: 1, expiresAt: 1 });
mediaAssetSchema.index({ 'linkedEntities.entityId': 1 });

export const MediaAsset: Model<IMediaAsset> =
  mongoose.models.MediaAsset || mongoose.model<IMediaAsset>('MediaAsset', mediaAssetSchema);
