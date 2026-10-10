import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IPortfolioItem {
  id: string;
  title: string;
  slug?: string;
  description: string;
  category: string;
  tags: string[];
  creativeTools: string[];
  mediaType: 'image' | 'video' | 'project';
  mediaUrl: string;
  thumbnailUrl?: string;
  assetId?: Types.ObjectId;
  thumbnailAssetId?: Types.ObjectId;
  projectUrl?: string;
  clientName?: string;
  completionDate?: Date;
  isFeatured: boolean;
  displayOrder: number;
  visibility: 'public' | 'unlisted' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

export interface IServiceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  deliverables: string[];
  revisions: number;
  price: number;
  currency: string;
  turnaroundDays: number;
  packageTier: 'starter' | 'standard' | 'premium';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreatorProfile extends Document {
  userId: Types.ObjectId;
  displayName: string;
  username: string;
  headline: string;
  biography: string;
  avatarUrl?: string;
  coverUrl?: string;
  specialties: string[];
  creativeTools: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  location?: string;
  website?: string;
  socialLinks: {
    twitter?: string;
    instagram?: string;
    github?: string;
    artstation?: string;
    behance?: string;
    linkedin?: string;
  };
  hourlyRate?: number;
  currency: string;
  availability: 'available' | 'limited' | 'busy';
  availabilityNote?: string;
  availableFromDate?: Date;
  portfolioItems: IPortfolioItem[];
  services: IServiceItem[];
  profileVisibility: 'public' | 'unlisted' | 'private';
  profileCompletion: number;
  calculateCompletion(): number;
  createdAt: Date;
  updatedAt: Date;
}

const portfolioItemSchema = new Schema<IPortfolioItem>(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    title: {
      type: String,
      required: [true, 'Portfolio title is required'],
      trim: true,
      maxlength: 120
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General'
    },
    tags: {
      type: [String],
      default: []
    },
    creativeTools: {
      type: [String],
      default: []
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'project'],
      default: 'image'
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required'],
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset'
    },
    thumbnailAssetId: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset'
    },
    projectUrl: {
      type: String,
      trim: true
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    completionDate: {
      type: Date
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public'
    }
  },
  {
    timestamps: true,
    _id: false
  }
);

const serviceItemSchema = new Schema<IServiceItem>(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    title: {
      type: String,
      required: [true, 'Service title is required'],
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1500,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'Creative Production'
    },
    deliverables: {
      type: [String],
      default: []
    },
    revisions: {
      type: Number,
      default: 2,
      min: 0,
      max: 20
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [5, 'Minimum service price is $5']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    },
    turnaroundDays: {
      type: Number,
      required: [true, 'Turnaround time in days is required'],
      min: [1, 'Turnaround must be at least 1 day'],
      max: [365, 'Turnaround cannot exceed 365 days']
    },
    packageTier: {
      type: String,
      enum: ['starter', 'standard', 'premium'],
      default: 'standard'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    _id: false
  }
);

const creatorProfileSchema = new Schema<ICreatorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: 100
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [/^[a-z0-9_.-]{3,30}$/, 'Username must be 3-30 characters alphanumeric']
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ''
    },
    biography: {
      type: String,
      trim: true,
      maxlength: 2500,
      default: ''
    },
    avatarUrl: {
      type: String,
      trim: true
    },
    coverUrl: {
      type: String,
      trim: true
    },
    specialties: {
      type: [String],
      default: []
    },
    creativeTools: {
      type: [String],
      default: []
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100
    },
    website: {
      type: String,
      trim: true
    },
    socialLinks: {
      twitter: { type: String, trim: true },
      instagram: { type: String, trim: true },
      github: { type: String, trim: true },
      artstation: { type: String, trim: true },
      behance: { type: String, trim: true },
      linkedin: { type: String, trim: true }
    },
    hourlyRate: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    },
    availability: {
      type: String,
      enum: ['available', 'limited', 'busy'],
      default: 'available'
    },
    availabilityNote: {
      type: String,
      trim: true,
      maxlength: 280
    },
    availableFromDate: {
      type: Date
    },
    portfolioItems: {
      type: [portfolioItemSchema],
      default: []
    },
    services: {
      type: [serviceItemSchema],
      default: []
    },
    profileVisibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public'
    },
    profileCompletion: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
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

creatorProfileSchema.index({ specialties: 1 });
creatorProfileSchema.index({ creativeTools: 1 });
creatorProfileSchema.index({ availability: 1 });
creatorProfileSchema.index({ profileVisibility: 1 });
creatorProfileSchema.index({ 'portfolioItems.visibility': 1 });
creatorProfileSchema.index({ 'services.status': 1 });

creatorProfileSchema.methods.calculateCompletion = function (): number {
  let score = 0;
  if (this.displayName && this.displayName.trim().length > 0) score += 10;
  if (this.headline && this.headline.trim().length > 0) score += 10;
  if (this.biography && this.biography.trim().length > 0) score += 15;
  if (this.specialties && this.specialties.length > 0) score += 15;
  if (this.creativeTools && this.creativeTools.length > 0) score += 10;
  if (this.portfolioItems && this.portfolioItems.length > 0) score += 20;
  if (this.services && this.services.length > 0) score += 10;
  if (this.hourlyRate || this.availability) score += 10;
  this.profileCompletion = Math.min(100, score);
  return this.profileCompletion;
};

export const CreatorProfile: Model<ICreatorProfile> =
  mongoose.models.CreatorProfile || mongoose.model<ICreatorProfile>('CreatorProfile', creatorProfileSchema);
