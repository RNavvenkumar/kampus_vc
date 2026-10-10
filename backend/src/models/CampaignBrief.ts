import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type BriefStatus = 'draft' | 'published' | 'paused' | 'archived' | 'awarded';
export type BudgetType = 'fixed' | 'range';
export type EngagementType = 'milestone' | 'retainer' | 'one_off';
export type LocationPreference = 'remote' | 'hybrid' | 'onsite';
export type ExperienceRequirement = 'any' | 'intermediate' | 'advanced' | 'expert';

export interface ICampaignBrief extends Document {
  brandId: Types.ObjectId;
  companyName: string;
  companySlug?: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  requiredSpecialties: string[];
  creativeTools: string[];
  deliverables: string[];
  budgetType: BudgetType;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  durationWeeks: number;
  targetStartDate?: Date;
  deadline?: Date;
  engagementType: EngagementType;
  locationPreference: LocationPreference;
  experienceLevel: ExperienceRequirement;
  referenceUrls: string[];
  status: BriefStatus;
  publishedAt?: Date;
  awardedProposalId?: Types.ObjectId;
  awardedCreatorId?: Types.ObjectId;
  awardedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campaignBriefSchema = new Schema<ICampaignBrief>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    companySlug: {
      type: String,
      trim: true,
      lowercase: true
    },
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
      maxlength: 150
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      required: true
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ''
    },
    category: {
      type: String,
      required: [true, 'Project category is required'],
      trim: true,
      default: 'General Creative'
    },
    requiredSpecialties: {
      type: [String],
      default: []
    },
    creativeTools: {
      type: [String],
      default: []
    },
    deliverables: {
      type: [String],
      default: []
    },
    budgetType: {
      type: String,
      enum: ['fixed', 'range'],
      default: 'range'
    },
    budgetMin: {
      type: Number,
      required: true,
      min: [0, 'Budget cannot be negative'],
      default: 1000
    },
    budgetMax: {
      type: Number,
      required: true,
      min: [0, 'Budget cannot be negative'],
      default: 3000
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    },
    durationWeeks: {
      type: Number,
      default: 4,
      min: 1,
      max: 52
    },
    targetStartDate: {
      type: Date
    },
    deadline: {
      type: Date
    },
    engagementType: {
      type: String,
      enum: ['milestone', 'retainer', 'one_off'],
      default: 'milestone'
    },
    locationPreference: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite'],
      default: 'remote'
    },
    experienceLevel: {
      type: String,
      enum: ['any', 'intermediate', 'advanced', 'expert'],
      default: 'any'
    },
    referenceUrls: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'paused', 'archived', 'awarded'],
      default: 'draft',
      index: true
    },
    publishedAt: {
      type: Date
    },
    awardedProposalId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignProposal'
    },
    awardedCreatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    awardedAt: {
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

// Indexes
campaignBriefSchema.index({ brandId: 1, createdAt: -1 });
campaignBriefSchema.index({ status: 1, publishedAt: -1 });
campaignBriefSchema.index({ category: 1 });
campaignBriefSchema.index({ slug: 1 });
campaignBriefSchema.index({ requiredSpecialties: 1 });

export const CampaignBrief: Model<ICampaignBrief> =
  mongoose.models.CampaignBrief || mongoose.model<ICampaignBrief>('CampaignBrief', campaignBriefSchema);
