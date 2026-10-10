import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Conversation, DirectMessage } from '../../types';
import {
  getMyConversations,
  getConversationMessages,
  sendDirectMessage,
  inquireCreator,
  extractErrorMessage
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If opening directly to chat with or inquire about a creator:
  targetCreator?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    headline?: string;
  };
  initialInquiry?: {
    serviceTitle?: string;
    packageTier?: string;
    price?: number;
    currency?: string;
  };
  initialConversationId?: string;
}

export const DirectChatModal: React.FC<DirectChatModalProps> = ({
  isOpen,
  onClose,
  targetCreator,
  initialInquiry,
  initialConversationId
}) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInquiryMode, setIsInquiryMode] = useState(false);
  const [inquiryCustomNote, setInquiryCustomNote] = useState('');
  const [inquirySuccessAlert, setInquirySuccessAlert] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations when opened
  const loadConversations = async (targetSelectId?: string) => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingConversations(true);
      const list = await getMyConversations();
      setConversations(list);

      // Determine which conversation to select
      if (targetSelectId) {
        const found = list.find((c) => c.id === targetSelectId);
        if (found) {
          selectConversation(found);
          return;
        }
      }

      if (targetCreator) {
        // Find existing conversation with this creator
        const matching = list.find((c) => {
          if (c.creatorProfile?.id === targetCreator.id) return true;
          if (c.creatorProfile?.displayName?.toLowerCase() === targetCreator.displayName?.toLowerCase()) return true;
          const partner = c.partner;
          return partner?.id === targetCreator.id || partner?.name === targetCreator.displayName;
        });

        if (matching) {
          selectConversation(matching);
          setIsInquiryMode(false);
        } else {
          // No conversation yet: show inquiry start screen
          setActiveConversation(null);
          setIsInquiryMode(true);
        }
      } else if (list.length > 0 && !activeConversation) {
        selectConversation(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setInquirySuccessAlert(null);
      loadConversations(initialConversationId);
    } else {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [isOpen, targetCreator?.id, initialConversationId]);

  // Select conversation and load messages
  const selectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setIsInquiryMode(false);
    setError(null);
    try {
      setIsLoadingMessages(true);
      const data = await getConversationMessages(conv.id);
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load messages'));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Real-time polling for new messages when active conversation is set
  useEffect(() => {
    if (!activeConversation || !isOpen) return;

    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const data = await getConversationMessages(activeConversation.id);
        setMessages((prev) => {
          if (data.messages.length !== prev.length) {
            setTimeout(scrollToBottom, 50);
            return data.messages;
          }
          return prev;
        });
      } catch (e) {
        // Ignore polling errors silently
      }
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [activeConversation?.id, isOpen]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversation || isSending) return;

    const messageContent = inputText.trim();
    setInputText('');

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: DirectMessage = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user?.id || '',
      recipientId: activeConversation.partner?.id || '',
      content: messageContent,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: user?.id || '',
        name: user?.name || 'You',
        role: user?.role || 'brand',
        avatarUrl: user?.avatarUrl || user?.avatar
      }
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 20);

    try {
      setIsSending(true);
      const sent = await sendDirectMessage(activeConversation.id, messageContent);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? sent : m)));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to send message'));
      // Remove optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // Submit direct inquiry
  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCreator) return;

    try {
      setIsSending(true);
      setError(null);
      const res = await inquireCreator({
        creatorId: targetCreator.id,
        message: inquiryCustomNote.trim() || undefined,
        serviceTitle: initialInquiry?.serviceTitle,
        packageTier: initialInquiry?.packageTier,
        price: initialInquiry?.price,
        currency: initialInquiry?.currency || 'INR'
      });

      setInquirySuccessAlert(`Your inquiry has been sent to ${targetCreator.displayName}! A real-time notification has been delivered to their account.`);
      setIsInquiryMode(false);
      setActiveConversation(res.conversation);
      setMessages([res.message]);
      loadConversations(res.conversation.id);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to send inquiry.'));
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl h-[620px] max-h-[92vh] bg-[#0E121A] border border-[#222938] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 px-6 border-b border-[#1E2536] bg-[#0A0D14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Real-Time Direct Messenger</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-[11px] text-gray-400">
                Direct text collaboration between Brands & Creators with real-time in-app notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner if just inquired */}
        {inquirySuccessAlert && (
          <div className="p-3 px-6 bg-emerald-950/60 border-b border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{inquirySuccessAlert}</span>
            </div>
            <button
              onClick={() => setInquirySuccessAlert(null)}
              className="text-emerald-400 hover:text-emerald-300 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Main Content: Split into Sidebar and Chat Window */}
        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar: Conversations List */}
          <div className="w-72 sm:w-80 border-r border-[#1E2536] bg-[#0A0D14]/60 flex flex-col shrink-0">
            <div className="p-3 px-4 border-b border-[#1E2536] flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Conversations ({conversations.length})
              </span>
              <button
                onClick={() => loadConversations()}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
                title="Refresh conversations"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">Loading inbox...</div>
              ) : conversations.length === 0 && !targetCreator ? (
                <div className="p-6 text-center text-xs text-gray-500 space-y-2">
                  <p>No conversations yet.</p>
                  <p className="text-[11px] text-gray-600">
                    Visit any creator profile and click "Inquire for Project" to start texting.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id && !isInquiryMode;
                  const partner = conv.partner;
                  const creatorInfo = conv.creatorProfile;
                  const displayName = creatorInfo?.displayName || partner?.name || 'User';
                  const avatar = creatorInfo?.avatarUrl || partner?.avatarUrl;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-start gap-3 border ${
                        isSelected
                          ? 'bg-[#151B27] border-emerald-500/50 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-gray-900/60 hover:border-[#1E2536]'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={
                            avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-[#2B3545]"
                        />
                        {conv.unreadCount && conv.unreadCount > 0 ? (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-white truncate">{displayName}</p>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                              {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {conv.lastMessage?.content || 'Started conversation'}
                        </p>
                        {conv.inquiryContext?.serviceTitle && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-300 font-mono truncate max-w-full">
                            Pkg: {conv.inquiryContext.serviceTitle}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Active Chat Window or Inquiry Form */}
          <div className="flex-1 flex flex-col bg-[#0E121A] min-w-0">
            {isInquiryMode && targetCreator ? (
              /* Inquiry Setup Form */
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    New Project Inquiry
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Connect with {targetCreator.displayName}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Send an inquiry directly to start a private text conversation. The creator will immediately receive an in-app notification.
                  </p>
                </div>

                {initialInquiry && (
                  <div className="p-4 rounded-xl bg-[#131824] border border-[#232B3C] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Target Service Package
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{initialInquiry.serviceTitle}</h4>
                      <p className="text-xs text-gray-400 capitalize">Tier: {initialInquiry.packageTier || 'Standard'}</p>
                    </div>
                    {initialInquiry.price && (
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block font-mono">Price</span>
                        <span className="text-lg font-extrabold text-emerald-400">
                          ₹{initialInquiry.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 font-mono">
                      Your Project Message & Requirements
                    </label>
                    <textarea
                      value={inquiryCustomNote}
                      onChange={(e) => setInquiryCustomNote(e.target.value)}
                      placeholder={`Hi ${targetCreator.displayName}, we have an upcoming campaign and would love to collaborate with you. Here are our initial requirements and timeline...`}
                      rows={5}
                      className="w-full bg-[#141924] border border-[#263044] rounded-xl p-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      isLoading={isSending}
                      rightIcon={<Send className="w-4 h-4" />}
                    >
                      Send Inquiry & Start Chat
                    </Button>
                  </div>
                </form>
              </div>
            ) : activeConversation ? (
              /* Active Chat Thread */
              <>
                {/* Active Partner Header */}
                <div className="p-3 px-5 border-b border-[#1E2536] bg-[#0C1017] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        activeConversation.creatorProfile?.avatarUrl ||
                        activeConversation.partner?.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                      }
                      alt="Partner"
                      className="w-9 h-9 rounded-full object-cover border border-[#263044]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>
                          {activeConversation.creatorProfile?.displayName ||
                            activeConversation.partner?.name ||
                            'Collaborator'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 capitalize font-mono">
                          {activeConversation.partner?.role || 'Creator'}
                        </span>
                      </h4>
                      {activeConversation.inquiryContext?.serviceTitle && (
                        <p className="text-[10px] text-gray-400">
                          Inquiry: {activeConversation.inquiryContext.serviceTitle}
                          {activeConversation.inquiryContext.price
                            ? ` (₹${activeConversation.inquiryContext.price.toLocaleString()})`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Syncing
                  </span>
                </div>

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500">
                      Loading chat messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
                      <MessageSquare className="w-8 h-8 text-gray-600" />
                      <p className="text-xs">No messages yet. Say hello to get started!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl p-3 px-4 text-xs leading-relaxed ${
                              isMe
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none shadow-md'
                                : 'bg-[#181F2C] border border-[#263145] text-gray-200 rounded-bl-none shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1 font-mono px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-2 px-4 bg-red-950/50 border-t border-red-500/30 text-red-200 text-xs">
                    {error}
                  </div>
                )}

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 px-4 border-t border-[#1E2536] bg-[#0A0D14] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message to chat in real time..."
                    className="flex-1 bg-[#141924] border border-[#263044] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!inputText.trim() || isSending}
                    isLoading={isSending}
                    className="px-4"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-300">Select a Conversation</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Choose a conversation from the left or inquire on a creator profile to text in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
