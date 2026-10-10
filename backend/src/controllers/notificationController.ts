import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';

// GET /api/notifications
export async function getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!._id;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments({ recipientId: userId }),
      Notification.countDocuments({ recipientId: userId, isRead: false })
    ]);

    res.status(200).json({
      success: true,
      data: notifications.map((n: any) => ({
        ...n,
        id: n._id.toString()
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        unreadCount,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!._id;
    const count = await Notification.countDocuments({ recipientId: userId, isRead: false });

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:notificationId/read
export async function markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawNotificationId = req.params.notificationId;
    const notificationId = Array.isArray(rawNotificationId) ? rawNotificationId[0] : rawNotificationId;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid notification identifier.' }
      });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({
        error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found or access denied.' }
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/notifications/mark-all-read
export async function markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!._id;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    next(err);
  }
}
