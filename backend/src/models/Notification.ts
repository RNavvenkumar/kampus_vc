import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type NotificationType =
  | 'proposal_submitted'
  | 'proposal_shortlisted'
  | 'revision_requested'
  | 'proposal_resubmitted'
  | 'proposal_accepted'
  | 'proposal_declined'
  | 'campaign_awarded_other'
  | 'project_created'
  | 'project_message'
  | 'deliverable_submitted'
  | 'deliverable_revision_requested'
  | 'deliverable_approved'
  | 'milestone_status_changed'
  | 'project_completed'
  | 'project_status_changed'
  | 'payment_captured'
  | 'payment_failed'
  | 'refund_processed';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  proposalId?: Types.ObjectId;
  briefId?: Types.ObjectId;
  projectId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  isRead: boolean;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'proposal_submitted',
        'proposal_shortlisted',
        'revision_requested',
        'proposal_resubmitted',
        'proposal_accepted',
        'proposal_declined',
        'campaign_awarded_other',
        'project_created',
        'project_message',
        'deliverable_submitted',
        'deliverable_revision_requested',
        'deliverable_approved',
        'milestone_status_changed',
        'project_completed',
        'project_status_changed',
        'payment_captured',
        'payment_failed',
        'refund_processed'
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignProposal'
    },
    briefId: {
      type: Schema.Types.ObjectId,
      ref: 'CampaignBrief'
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project'
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true
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

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
