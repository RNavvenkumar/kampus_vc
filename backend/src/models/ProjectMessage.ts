import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IMessageAttachment {
  assetId: Types.ObjectId;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  category: 'image' | 'video';
  accessUrl?: string;
}

export interface IProjectMessage extends Document {
  projectId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderRole: 'creator' | 'brand';
  content: string;
  attachments: IMessageAttachment[];
  replyToMessageId?: Types.ObjectId;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageAttachmentSchema = new Schema<IMessageAttachment>(
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

const projectMessageSchema = new Schema<IProjectMessage>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    senderRole: {
      type: String,
      enum: ['creator', 'brand'],
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    attachments: {
      type: [messageAttachmentSchema],
      default: []
    },
    replyToMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectMessage'
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
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

projectMessageSchema.index({ projectId: 1, createdAt: 1 });
projectMessageSchema.index({ projectId: 1, _id: 1 });

export const ProjectMessage: Model<IProjectMessage> =
  mongoose.models.ProjectMessage || mongoose.model<IProjectMessage>('ProjectMessage', projectMessageSchema);
