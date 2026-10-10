import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type SubmissionStatus = 'submitted' | 'revision_requested' | 'approved';

export interface ISubmissionAttachment {
  assetId: Types.ObjectId;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  category: 'image' | 'video';
  accessUrl?: string;
}

export interface IProjectSubmission extends Document {
  projectId: Types.ObjectId;
  milestoneId: Types.ObjectId;
  version: number;
  creatorId: Types.ObjectId;
  submissionNotes: string;
  attachments: ISubmissionAttachment[];
  externalLinks: string[];
  status: SubmissionStatus;
  reviewFeedback?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<ISubmissionAttachment>(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset',
      required: true
    },
    filename: {
      type: String,
      required: true,
      trim: true
    },
    fileSizeBytes: {
      type: Number,
      required: true,
      min: 0
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
    accessUrl: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const projectSubmissionSchema = new Schema<IProjectSubmission>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    milestoneId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true,
      min: 1
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    submissionNotes: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    externalLinks: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['submitted', 'revision_requested', 'approved'],
      default: 'submitted',
      index: true
    },
    reviewFeedback: {
      type: String,
      trim: true,
      maxlength: 3000
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    submittedAt: {
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

projectSubmissionSchema.index({ projectId: 1, milestoneId: 1, version: 1 }, { unique: true });
projectSubmissionSchema.index({ projectId: 1, createdAt: -1 });

export const ProjectSubmission: Model<IProjectSubmission> =
  mongoose.models.ProjectSubmission || mongoose.model<IProjectSubmission>('ProjectSubmission', projectSubmissionSchema);
