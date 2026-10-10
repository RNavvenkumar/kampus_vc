import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { DirectMessage } from '../models/DirectMessage.js';
import { CreatorProfile } from '../models/CreatorProfile.js';
import { User, IUser } from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

export const inquireSchema = z.object({
  creatorId: z.string().min(1, 'Creator ID or Username is required'),
  message: z.string().max(2000).optional(),
  serviceTitle: z.string().max(200).optional(),
  packageTier: z.string().max(50).optional(),
  price: z.number().optional(),
  currency: z.string().max(10).default('INR')
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message cannot exceed 5000 characters')
});

/**
 * POST /api/conversations/inquire
 * Initiates an inquiry from a Brand to a Creator, creating conversation, message, and real notification.
 */
export async function inquireCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const brandUser = req.user as IUser;
    const { creatorId, message, serviceTitle, packageTier, price, currency } = inquireSchema.parse(req.body);

    // Find target creator profile
    let creatorProfile: any = null;
    if (mongoose.Types.ObjectId.isValid(creatorId)) {
      creatorProfile = await CreatorProfile.findById(creatorId);
    }
    if (!creatorProfile) {
      creatorProfile = await CreatorProfile.findOne({
        $or: [{ username: creatorId.toLowerCase() }, { displayName: creatorId }]
      });
    }

    if (!creatorProfile || !creatorProfile.userId) {
      res.status(404).json({
        success: false,
        error: { message: 'Creator profile not found or does not have an active account.' }
      });
      return;
    }

    const creatorUserId = creatorProfile.userId;

    if (creatorUserId.toString() === brandUser._id.toString()) {
      res.status(400).json({
        success: false,
        error: { message: 'You cannot send an inquiry to yourself.' }
      });
      return;
    }

    // Find existing conversation or create new
    let conversation = await Conversation.findOne({
      participants: { $all: [brandUser._id, creatorUserId] }
    });

    const inquiryNote = serviceTitle
      ? `Hi ${creatorProfile.displayName}, I am inquiring about your "${serviceTitle}" package (${packageTier || 'standard'}) for ₹${price?.toLocaleString() || ''}. ${message || "I'd love to discuss our project requirements."}`
      : message || `Hi ${creatorProfile.displayName}, I am inquiring about a custom project on Kampus.VC. Let's discuss scope and availability!`;

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [brandUser._id, creatorUserId],
        creatorProfileId: creatorProfile._id,
        inquiryContext: {
          serviceTitle,
          packageTier,
          price,
          currency: currency || 'INR'
        },
        lastMessage: {
          content: inquiryNote,
          senderId: brandUser._id,
          sentAt: new Date()
        },
        lastMessageAt: new Date()
      });
    } else {
      conversation.lastMessage = {
        content: inquiryNote,
        senderId: brandUser._id,
        sentAt: new Date()
      };
      conversation.lastMessageAt = new Date();
      if (serviceTitle) {
        conversation.inquiryContext = {
          serviceTitle,
          packageTier,
          price,
          currency: currency || 'INR'
        };
      }
      await conversation.save();
    }

    // Create the message record
    const directMessage = await DirectMessage.create({
      conversationId: conversation._id,
      senderId: brandUser._id,
      recipientId: creatorUserId,
      content: inquiryNote,
      isRead: false
    });

    // Send real-time notification to Creator
    await createNotification({
      recipientId: creatorUserId as any,
      type: 'project_inquiry',
      title: `New Project Inquiry from ${brandUser.name}`,
      message: serviceTitle
        ? `${brandUser.name} inquired about your "${serviceTitle}" package.`
        : `${brandUser.name} sent you a direct project inquiry: "${inquiryNote.slice(0, 100)}..."`,
      conversationId: conversation._id as any
    });

    res.status(201).json({
      success: true,
      message: `Inquiry sent successfully to ${creatorProfile.displayName}!`,
      data: {
        conversation,
        message: directMessage
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/conversations
 * Fetch all conversations for the authenticated user.
 */
export async function getMyConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;

    const conversations = await Conversation.find({
      participants: user._id
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name email role avatarUrl')
      .populate('creatorProfileId', 'displayName headline avatarUrl username')
      .lean();

    const formatted = await Promise.all(
      conversations.map(async (c: any) => {
        const partner = (c.participants || []).find((p: any) => p._id.toString() !== user._id.toString());
        const unreadCount = await DirectMessage.countDocuments({
          conversationId: c._id,
          recipientId: user._id,
          isRead: false
        });

        return {
          ...c,
          id: c._id.toString(),
          partner: partner
            ? {
                id: partner._id.toString(),
                name: partner.name,
                email: partner.email,
                role: partner.role,
                avatarUrl: partner.avatarUrl
              }
            : null,
          creatorProfile: c.creatorProfileId
            ? {
                id: c.creatorProfileId._id?.toString() || c.creatorProfileId.id,
                displayName: c.creatorProfileId.displayName,
                headline: c.creatorProfileId.headline,
                avatarUrl: c.creatorProfileId.avatarUrl,
                username: c.creatorProfileId.username
              }
            : undefined,
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        conversations: formatted
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/conversations/:id/messages
 * Fetch messages inside a conversation and mark as read.
 */
export async function getConversationMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid conversation ID' } });
      return;
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      return;
    }

    const isParticipant = conversation.participants.some((p) => p.toString() === user._id.toString());
    if (!isParticipant) {
      res.status(403).json({ success: false, error: { message: 'Access denied to this conversation' } });
      return;
    }

    // Mark unread messages sent to this user as read
    await DirectMessage.updateMany(
      {
        conversationId: conversation._id,
        recipientId: user._id,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    const messages = await DirectMessage.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name email role avatarUrl')
      .lean();

    const formattedMessages = messages.map((m: any) => ({
      ...m,
      id: m._id.toString(),
      sender: m.senderId
        ? {
            id: m.senderId._id?.toString() || m.senderId.id,
            name: m.senderId.name,
            role: m.senderId.role,
            avatarUrl: m.senderId.avatarUrl
          }
        : undefined
    }));

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages: formattedMessages
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/conversations/:id/messages
 * Send a direct message in real time to the other participant.
 */
export async function sendDirectMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user as IUser;
    const id = req.params.id as string;
    const { content } = sendMessageSchema.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { message: 'Invalid conversation ID' } });
      return;
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      res.status(404).json({ success: false, error: { message: 'Conversation not found' } });
      return;
    }

    const isParticipant = conversation.participants.some((p) => p.toString() === user._id.toString());
    if (!isParticipant) {
      res.status(403).json({ success: false, error: { message: 'Access denied to this conversation' } });
      return;
    }

    const recipientId = conversation.participants.find((p) => p.toString() !== user._id.toString());
    if (!recipientId) {
      res.status(400).json({ success: false, error: { message: 'No recipient in this conversation' } });
      return;
    }

    const directMessage = await DirectMessage.create({
      conversationId: conversation._id,
      senderId: user._id,
      recipientId,
      content: content.trim(),
      isRead: false
    });

    conversation.lastMessage = {
      content: content.trim(),
      senderId: user._id,
      sentAt: new Date()
    };
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Trigger notification to recipient
    await createNotification({
      recipientId: recipientId as any,
      type: 'direct_message',
      title: `New message from ${user.name}`,
      message: content.length > 80 ? `${content.slice(0, 77)}...` : content,
      conversationId: conversation._id as any
    });

    const populated = await DirectMessage.findById(directMessage._id)
      .populate('senderId', 'name email role avatarUrl')
      .lean();

    res.status(201).json({
      success: true,
      data: {
        message: {
          ...populated,
          id: directMessage._id.toString(),
          sender: {
            id: user._id.toString(),
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl
          }
        }
      }
    });
  } catch (err) {
    next(err);
  }
}
