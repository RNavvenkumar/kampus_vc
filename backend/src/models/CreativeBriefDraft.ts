import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import {
  GeneratedBrief,
  CreativeDirection,
  MoodboardAnalysis,
  RequirementSynthesis
} from '../ai/schemas.js';

export interface IDraftImprovementHistory {
  timestamp: Date;
  field: string;
  originalText: string;
  improvedText: string;
  applied: boolean;
}

export interface IMoodboardRef {
  url: string;
  caption?: string;
  addedAt?: Date;
}

export interface ICreativeBriefDraft extends Document {
  brandId: Types.ObjectId;
  campaignBriefId?: Types.ObjectId;
  title: string;
  userPrompt: string;
  promptContext?: {
    category?: string;
    knownBudgetMin?: number;
    knownBudgetMax?: number;
    currency?: string;
    timelineWeeks?: number;
    locationPreference?: string;
  };
  structuredBrief: GeneratedBrief;
  creativeDirections: CreativeDirection[];
  selectedDirectionIndex?: number;
  moodboardReferences: IMoodboardRef[];
  moodboardAnalysis?: MoodboardAnalysis;
  synthesizedRequirements?: RequirementSynthesis;
  improvementsHistory: IDraftImprovementHistory[];
  version: number;
  generationStatus: 'draft' | 'generating' | 'ready' | 'failed';
  aiMetadata?: {
    provider?: string;
    model?: string;
    totalTokens?: number;
    generatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const creativeBriefDraftSchema = new Schema<ICreativeBriefDraft>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    campaignBriefId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignBrief'
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    userPrompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    promptContext: {
      category: String,
      knownBudgetMin: Number,
      knownBudgetMax: Number,
      currency: { type: String, default: 'USD' },
      timelineWeeks: Number,
      locationPreference: String
    },
    structuredBrief: {
      type: Schema.Types.Mixed,
      required: true
    },
    creativeDirections: [Schema.Types.Mixed],
    selectedDirectionIndex: {
      type: Number,
      default: 0
    },
    moodboardReferences: [
      {
        url: { type: String, required: true, trim: true },
        caption: { type: String, trim: true },
        addedAt: { type: Date, default: Date.now }
      }
    ],
    moodboardAnalysis: {
      type: Schema.Types.Mixed
    },
    synthesizedRequirements: {
      type: Schema.Types.Mixed
    },
    improvementsHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        field: { type: String, required: true },
        originalText: { type: String, required: true },
        improvedText: { type: String, required: true },
        applied: { type: Boolean, default: false }
      }
    ],
    version: {
      type: Number,
      default: 1
    },
    generationStatus: {
      type: String,
      enum: ['draft', 'generating', 'ready', 'failed'],
      default: 'ready'
    },
    aiMetadata: {
      provider: String,
      model: String,
      totalTokens: Number,
      generatedAt: Date
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

creativeBriefDraftSchema.index({ brandId: 1, updatedAt: -1 });
creativeBriefDraftSchema.index({ campaignBriefId: 1 });

export const CreativeBriefDraft: Model<ICreativeBriefDraft> =
  mongoose.models.CreativeBriefDraft ||
  mongoose.model<ICreativeBriefDraft>('CreativeBriefDraft', creativeBriefDraftSchema);
