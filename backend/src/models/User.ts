import mongoose, { Document, Schema, Model } from 'mongoose';

export type UserRole = 'creator' | 'brand' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type OnboardingStatus = 'pending' | 'in_progress' | 'completed';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  toSafeObject(): Partial<IUser>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address format']
    },
    passwordHash: {
      type: String,
      required: false
    },
    googleId: {
      type: String,
      sparse: true,
      index: true
    },
    avatarUrl: {
      type: String
    },
    role: {
      type: String,
      enum: ['creator', 'brand', 'admin'],
      required: [true, 'User role is required'],
      default: 'creator'
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active'
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    onboardingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    onboardingStep: {
      type: Number,
      default: 1
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.passwordHash;
        delete ret.__v;
        ret.id = ret._id?.toString() || ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });

userSchema.methods.toSafeObject = function (): Partial<IUser> {
  const obj: Record<string, any> = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  obj.id = obj._id?.toString() || obj._id;
  delete obj._id;
  return obj as Partial<IUser>;
};

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
