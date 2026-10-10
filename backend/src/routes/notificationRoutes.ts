import { Router } from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', getMyNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/:notificationId/read', markNotificationRead);
notificationRouter.post('/mark-all-read', markAllNotificationsRead);
