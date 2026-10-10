import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IBrandProfile extends Document {
  userId: Types.ObjectId;
  companyName: string;
  companySlug?: string;
  industry: string;
  companySize: string;
  website?: string;
  description: string;
  logoUrl?: string;
  location?: string;
  contactName: string;
  contactRole?: string;
  profileCompletion: number;
  calculateCompletion(): number;
  createdAt: Date;
  updatedAt: Date;
}

const brandProfileSchema = new Schema<IBrandProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 120
    },
    companySlug: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [/^[a-z0-9_-]{2,50}$/, 'Slug must be alphanumeric']
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
      default: 'Digital Media & Marketing'
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
      default: '1-10'
    },
    website: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2500,
      default: ''
    },
    logoUrl: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100
    },
    contactName: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      maxlength: 100
    },
    contactRole: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Creative Director'
    },
    profileCompletion: {
      type: Number,
      default: 25,
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

brandProfileSchema.index({ industry: 1 });
brandProfileSchema.index({ companyName: 1 });

brandProfileSchema.methods.calculateCompletion = function (): number {
  let score = 0;
  if (this.companyName && this.companyName.trim().length > 0) score += 25;
  if (this.industry && this.industry.trim().length > 0) score += 20;
  if (this.description && this.description.trim().length > 0) score += 20;
  if (this.contactName && this.contactName.trim().length > 0) score += 15;
  if (this.website && this.website.trim().length > 0) score += 10;
  if (this.location || this.logoUrl) score += 10;
  this.profileCompletion = Math.min(100, score);
  return this.profileCompletion;
};

export const BrandProfile: Model<IBrandProfile> =
  mongoose.models.BrandProfile || mongoose.model<IBrandProfile>('BrandProfile', brandProfileSchema);
