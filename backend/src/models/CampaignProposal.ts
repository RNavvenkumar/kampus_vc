import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'shortlisted'
  | 'revision_requested'
  | 'accepted'
  | 'declined'
  | 'withdrawn';

export interface IProposalMilestone {
  title: string;
  description?: string;
  amount?: number;
  durationWeeks?: number;
  order: number;
}

export interface IAcceptedAgreementSnapshot {
  agreedPrice: number;
  currency: string;
  deliveryDurationWeeks: number;
  targetStartDate?: Date;
  deliverables: string[];
  milestones: IProposalMilestone[];
  revisionAllowance: number;
  pitchTitle?: string;
  pitchMessage: string;
  creatorId: Types.ObjectId;
  brandId: Types.ObjectId;
  briefId: Types.ObjectId;
  acceptedAt: Date;
  proposalVersion: number;
}

export interface ICampaignProposal extends Document {
  creatorId: Types.ObjectId;
  briefId: Types.ObjectId;
  brandId: Types.ObjectId;
  proposalReference: string;
  pitchTitle?: string;
  pitchMessage: string;
  referencedPortfolioItemIds: string[];
  referencedServiceId?: string;
  proposedPrice: number;
  currency: string;
  deliveryDurationWeeks: number;
  targetStartDate?: Date;
  deliverables: string[];
  milestones: IProposalMilestone[];
  revisionAllowance: number;
  status: ProposalStatus;
  revisionMessage?: string;
  submittedAt?: Date;
  decisionAt?: Date;
  revisionNumber: number;
  acceptedAgreementSnapshot?: IAcceptedAgreementSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IProposalMilestone>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    amount: { type: Number, min: 0 },
    durationWeeks: { type: Number, min: 1, max: 52 },
    order: { type: Number, required: true, default: 1 }
  },
  { _id: false }
);

const campaignProposalSchema = new Schema<ICampaignProposal>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    briefId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignBrief',
      required: true
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    proposalReference: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    pitchTitle: {
      type: String,
      trim: true,
      maxlength: 150
    },
    pitchMessage: {
      type: String,
      required: [true, 'Pitch message is required'],
      trim: true,
      minlength: [20, 'Pitch message must be at least 20 characters'],
      maxlength: [3000, 'Pitch message cannot exceed 3000 characters']
    },
    referencedPortfolioItemIds: {
      type: [String],
      default: []
    },
    referencedServiceId: {
      type: String,
      trim: true
    },
    proposedPrice: {
      type: Number,
      required: true,
      min: [1, 'Proposed price must be greater than zero']
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: 'USD'
    },
    deliveryDurationWeeks: {
      type: Number,
      required: true,
      min: [1, 'Duration must be at least 1 week'],
      max: [52, 'Duration cannot exceed 52 weeks']
    },
    targetStartDate: {
      type: Date
    },
    deliverables: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0 && v.every((s) => s.trim().length > 0),
        message: 'At least one deliverable is required'
      }
    },
    milestones: {
      type: [milestoneSchema],
      default: []
    },
    revisionAllowance: {
      type: Number,
      default: 2,
      min: 0,
      max: 10
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'shortlisted',
        'revision_requested',
        'accepted',
        'declined',
        'withdrawn'
      ],
      default: 'draft',
      index: true
    },
    revisionMessage: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    submittedAt: {
      type: Date
    },
    decisionAt: {
      type: Date
    },
    revisionNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    acceptedAgreementSnapshot: {
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
campaignProposalSchema.index({ creatorId: 1, briefId: 1 }, { unique: true });
campaignProposalSchema.index({ briefId: 1, status: 1 });
campaignProposalSchema.index({ brandId: 1, status: 1, createdAt: -1 });
campaignProposalSchema.index({ creatorId: 1, status: 1, createdAt: -1 });

export const CampaignProposal: Model<ICampaignProposal> =
  mongoose.models.CampaignProposal ||
  mongoose.model<ICampaignProposal>('CampaignProposal', campaignProposalSchema);
