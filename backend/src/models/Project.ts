import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { IAcceptedAgreementSnapshot, IProposalMilestone } from './CampaignProposal.js';

export type ProjectStatus = 'ready_for_kickoff' | 'in_progress' | 'completed' | 'cancelled';

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted_for_review'
  | 'revision_requested'
  | 'approved';

export interface IProjectMilestone {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  amount?: number;
  durationWeeks?: number;
  order: number;
  deliverables?: string[];
  dueDate?: Date;
  status: MilestoneStatus;
  startedAt?: Date;
  approvedAt?: Date;
}

export interface IProject extends Document {
  projectReference: string;
  briefId: Types.ObjectId;
  proposalId: Types.ObjectId;
  creatorId: Types.ObjectId;
  brandId: Types.ObjectId;
  title: string;
  agreedDescription: string;
  agreedDeliverables: string[];
  agreedPrice: number;
  currency: string;
  deliveryDurationWeeks: number;
  targetStartDate?: Date;
  milestones: IProjectMilestone[];
  revisionAllowance: number;
  status: ProjectStatus;
  agreementSnapshot: IAcceptedAgreementSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IProjectMilestone>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, min: 0 },
    durationWeeks: { type: Number, min: 1, max: 52 },
    order: { type: Number, required: true, default: 1 },
    deliverables: { type: [String], default: [] },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted_for_review', 'revision_requested', 'approved'],
      default: 'not_started'
    },
    startedAt: { type: Date },
    approvedAt: { type: Date }
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    projectReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    briefId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignBrief',
      required: true
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignProposal',
      required: true,
      unique: true
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    agreedDescription: {
      type: String,
      required: true,
      trim: true
    },
    agreedDeliverables: {
      type: [String],
      required: true
    },
    agreedPrice: {
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
    deliveryDurationWeeks: {
      type: Number,
      required: true,
      min: 1
    },
    targetStartDate: {
      type: Date
    },
    milestones: {
      type: [milestoneSchema],
      default: []
    },
    revisionAllowance: {
      type: Number,
      default: 2,
      min: 0
    },
    status: {
      type: String,
      enum: ['ready_for_kickoff', 'in_progress', 'completed', 'cancelled'],
      default: 'ready_for_kickoff',
      index: true
    },
    agreementSnapshot: {
      type: Schema.Types.Mixed,
      required: true
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

projectSchema.index({ creatorId: 1, createdAt: -1 });
projectSchema.index({ brandId: 1, createdAt: -1 });
projectSchema.index({ briefId: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);
