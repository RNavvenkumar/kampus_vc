import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ProjectActivityType =
  | 'workspace_initialized'
  | 'project_kickoff'
  | 'milestone_started'
  | 'deliverable_submitted'
  | 'revision_requested'
  | 'deliverable_approved'
  | 'project_completed'
  | 'message_sent'
  | 'payment_deposited'
  | 'payment_refunded';

export interface IProjectActivity extends Document {
  projectId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: 'creator' | 'brand' | 'system';
  eventType: ProjectActivityType;
  title: string;
  description: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  createdAt: Date;
}

const projectActivitySchema = new Schema<IProjectActivity>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorRole: {
      type: String,
      enum: ['creator', 'brand', 'system'],
      required: true
    },
    eventType: {
      type: String,
      enum: [
        'workspace_initialized',
        'project_kickoff',
        'milestone_started',
        'deliverable_submitted',
        'revision_requested',
        'deliverable_approved',
        'project_completed',
        'message_sent',
        'payment_deposited',
        'payment_refunded'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

projectActivitySchema.index({ projectId: 1, createdAt: -1 });

export const ProjectActivity: Model<IProjectActivity> =
  mongoose.models.ProjectActivity || mongoose.model<IProjectActivity>('ProjectActivity', projectActivitySchema);
