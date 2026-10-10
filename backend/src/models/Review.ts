import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IReview extends Document {
  projectId: Types.ObjectId;
  milestoneId?: Types.ObjectId;
  brandId: Types.ObjectId;
  creatorId: Types.ObjectId;
  rating: number; // 1 to 5
  review: string;
  projectTitle: string;
  brandName: string;
  brandAvatar?: string;
  creatorName: string;
  creatorAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    milestoneId: {
      type: Schema.Types.ObjectId
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true
    },
    brandName: {
      type: String,
      required: true,
      trim: true
    },
    brandAvatar: {
      type: String
    },
    creatorName: {
      type: String,
      required: true,
      trim: true
    },
    creatorAvatar: {
      type: String
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

reviewSchema.index({ creatorId: 1, createdAt: -1 });
reviewSchema.index({ brandId: 1, createdAt: -1 });
reviewSchema.index({ projectId: 1 });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);
