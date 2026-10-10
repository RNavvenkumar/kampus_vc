import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  inquireCreator,
  getMyConversations,
  getConversationMessages,
  sendDirectMessage
} from '../controllers/conversationController.js';

export const conversationRouter = Router();

conversationRouter.use(requireAuth);

conversationRouter.post('/inquire', inquireCreator);
conversationRouter.get('/', getMyConversations);
conversationRouter.get('/:id/messages', getConversationMessages);
conversationRouter.post('/:id/messages', sendDirectMessage);
