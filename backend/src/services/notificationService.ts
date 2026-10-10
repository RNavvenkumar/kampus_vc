import { Types } from 'mongoose';
import { Notification, NotificationType } from '../models/Notification.js';

interface CreateNotificationParams {
  recipientId: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  proposalId?: Types.ObjectId | string;
  briefId?: Types.ObjectId | string;
  projectId?: Types.ObjectId | string;
  idempotencyKey?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    if (params.idempotencyKey) {
      const existing = await Notification.findOne({ idempotencyKey: params.idempotencyKey });
      if (existing) {
        return;
      }
    }

    await Notification.create({
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      proposalId: params.proposalId,
      briefId: params.briefId,
      projectId: params.projectId,
      idempotencyKey: params.idempotencyKey
    });
  } catch (err) {
    // Log without throwing to ensure core transaction isn't broken by secondary notification delivery
    console.error('Failed to create notification:', err);
  }
}
