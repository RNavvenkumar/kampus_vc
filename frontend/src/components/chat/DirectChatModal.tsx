import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Search,
  CheckCheck,
  User,
  ExternalLink
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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

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
      } catch {
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
        avatarUrl: user?.avatarUrl
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

      setInquirySuccessAlert(`Inquiry sent to ${targetCreator.displayName}! Conversation initialized.`);
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

  const filteredConversations = conversations.filter((c) => {
    const name = c.partner?.name || c.creatorProfile?.displayName || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl h-[680px] max-h-[90vh] bg-[#0b141a] border border-[#222c36] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden m-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* WhatsApp-Style Top Header Bar */}
        <div className="p-3.5 px-6 border-b border-[#202c33] bg-[#202c33] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Kampus.VC Messages</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-[11px] text-emerald-400 font-mono">
                Real-Time WhatsApp Encrypted Chat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2a3942] transition-colors"
            aria-label="Close chat window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner if just inquired */}
        {inquirySuccessAlert && (
          <div className="p-3 px-6 bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{inquirySuccessAlert}</span>
            </div>
            <button
              onClick={() => setInquirySuccessAlert(null)}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Main Content: Split into Sidebar and Chat Window */}
        <div className="flex-1 flex min-h-0 bg-[#0b141a]">
          {/* Left Sidebar: Conversations List */}
          <div className="w-72 sm:w-80 border-r border-[#202c33] bg-[#111b21] flex flex-col shrink-0">
            {/* Search & Refresh Bar */}
            <div className="p-2.5 bg-[#111b21] border-b border-[#202c33] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#202c33] border-none rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
              <button
                onClick={() => loadConversations()}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#202c33] transition-colors"
                title="Refresh conversations"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingConversations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/40 p-1">
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">Loading inbox...</div>
              ) : filteredConversations.length === 0 && !targetCreator ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <p>No conversations found.</p>
                  <p className="text-[11px] text-slate-600">
                    Visit any creator profile and click "Message Creator" to start texting.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
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
                          ? 'bg-[#2a3942] border-emerald-500/40 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-[#202c33]'
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
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111b21]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-100 truncate">{displayName}</p>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {conv.lastMessage?.content || 'Started conversation'}
                        </p>
                        {conv.inquiryContext?.serviceTitle && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] text-emerald-300 font-mono truncate max-w-full">
                            {conv.inquiryContext.serviceTitle}
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
          <div className="flex-1 flex flex-col bg-[#0b141a] min-w-0">
            {isInquiryMode && targetCreator ? (
              /* Inquiry Setup Form */
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    New Direct Message
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">
                    Chat with {targetCreator.displayName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Send an inquiry to initiate a WhatsApp-style real-time conversation. The creator receives an in-app notification immediately.
                  </p>
                </div>

                {initialInquiry && (
                  <div className="p-4 rounded-xl bg-[#121c24] border border-[#202c33] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Target Service Package
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{initialInquiry.serviceTitle}</h4>
                      <p className="text-xs text-slate-400 capitalize">Tier: {initialInquiry.packageTier || 'Standard'}</p>
                    </div>
                    {initialInquiry.price && (
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-mono">Package Price</span>
                        <span className="text-lg font-extrabold text-emerald-400">
                          ₹{initialInquiry.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendInquiry} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                      Your Message & Campaign Expectations
                    </label>
                    <textarea
                      value={inquiryCustomNote}
                      onChange={(e) => setInquiryCustomNote(e.target.value)}
                      placeholder={`Hi ${targetCreator.displayName}, we have an upcoming creative brief and would love to collaborate...`}
                      rows={5}
                      className="w-full bg-[#111b21] border border-[#202c33] rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
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
                      className="bg-emerald-600 hover:bg-emerald-500 border-0"
                    >
                      Send Message & Start Chat
                    </Button>
                  </div>
                </form>
              </div>
            ) : activeConversation ? (
              /* Active Chat Thread */
              <>
                {/* Active Partner Header */}
                <div className="p-3 px-5 border-b border-[#202c33] bg-[#202c33] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        activeConversation.creatorProfile?.avatarUrl ||
                        activeConversation.partner?.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                      }
                      alt="Partner"
                      className="w-9 h-9 rounded-full object-cover border border-[#2B3545]"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>
                          {activeConversation.creatorProfile?.displayName ||
                            activeConversation.partner?.name ||
                            'Collaborator'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 capitalize font-mono">
                          {activeConversation.partner?.role || 'Creator'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        online
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeConversation.creatorProfile?.id && (
                      <a
                        href={`/creators/${activeConversation.creatorProfile.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#2a3942] text-slate-300 hover:text-white transition-colors"
                      >
                        <User className="w-3 h-3 text-cyan-400" />
                        <span>Profile</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-600" />
                      <p className="text-xs">No messages yet. Say hello to get started!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id || msg.sender?.role === 'brand';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl p-3 px-4 text-xs leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-[#005c4b] text-white rounded-tr-none'
                                : 'bg-[#202c33] border border-[#2a3942] text-slate-100 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-300/80 font-mono">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isMe && <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-2 px-4 bg-red-950/60 border-t border-red-500/30 text-red-200 text-xs shrink-0">
                    {error}
                  </div>
                )}

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 px-4 border-t border-[#202c33] bg-[#202c33] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#2a3942] border-none rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center transition-all shrink-0"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#202c33] flex items-center justify-center text-emerald-400 border border-[#2a3942]">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Select a Conversation</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Choose a conversation from the left to start texting in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
