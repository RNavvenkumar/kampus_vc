import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CampaignBrief, BriefStats, Conversation, DirectMessage } from '../../types';
import {
  getMyBrandBriefs,
  getMyConversations,
  getConversationMessages,
  sendDirectMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  ShieldCheck,
  Plus,
  Layers,
  FileText,
  MessageSquare,
  Send,
  Search,
  CheckCheck,
  User,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  LayoutDashboard
} from 'lucide-react';

import { DirectChatModal } from '../../components/chat/DirectChatModal';

export const BrandDashboardPage: React.FC = () => {
  const { user, brandProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'messages' ? 'messages' : 'overview';

  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>(initialTab);
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [stats, setStats] = useState<BriefStats>({
    total: 0,
    draft: 0,
    published: 0,
    paused: 0,
    archived: 0
  });

  // WhatsApp-style Chat States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'messages' && activeTab !== 'messages') {
      setActiveTab('messages');
    }
  }, [searchParams]);

  const switchTab = (tab: 'overview' | 'messages') => {
    setActiveTab(tab);
    setSearchParams(tab === 'messages' ? { tab: 'messages' } : {});
    if (tab === 'messages') {
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Fetch Dashboard Briefs
  useEffect(() => {
    const fetchDashboardBriefs = async () => {
      try {
        const res = await getMyBrandBriefs({ limit: 5 });
        setBriefs(res.briefs || []);
        if (res.stats) {
          setStats(res.stats);
        }
      } catch {
        // Fallback
      }
    };
    fetchDashboardBriefs();
  }, []);

  // Fetch Conversations for Messages section & Unread count
  const fetchConversationsList = async () => {
    try {
      setIsLoadingConversations(true);
      const list = await getMyConversations();
      setConversations(list);

      const unreadCount = list.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
      setTotalUnread(unreadCount);

      // If in messages tab and no conversation selected, select the first one
      if (list.length > 0 && !selectedConversation) {
        handleSelectConversation(list[0]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversationsList();
  }, []);

  // Polling for live messages when on Messages tab
  useEffect(() => {
    if (activeTab === 'messages' && selectedConversation) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const res = await getConversationMessages(selectedConversation.id);
          setMessages(res.messages || []);
        } catch {
          // silent sync
        }
      }, 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeTab, selectedConversation]);

  // Scroll on messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setIsLoadingMessages(true);
    try {
      const res = await getConversationMessages(conv.id);
      setMessages(res.messages || []);
      // Mark as read locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
      setTotalUnread((prev) => Math.max(0, prev - (conv.unreadCount || 0)));
    } catch (err) {
      console.error('Failed to fetch conversation messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConversation || isSending) return;

    const content = inputText.trim();
    setInputText('');

    // Optimistic UI bubble
    const optimisticMsg: DirectMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: user?.id || 'me',
      sender: {
        id: user?.id || 'me',
        name: brandProfile?.companyName || user?.name || 'Brand Lead',
        role: 'brand',
        avatarUrl: brandProfile?.logoUrl || user?.avatarUrl
      },
      recipientId: selectedConversation.partner?.id || '',
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      setIsSending(true);
      const sent = await sendDirectMessage(selectedConversation.id, content);
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? sent : m)));
      // Update last message in conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? {
                ...c,
                lastMessage: {
                  content,
                  senderId: user?.id || 'me',
                  sentAt: new Date().toISOString()
                },
                lastMessageAt: new Date().toISOString()
              }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send direct message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.partner?.name || c.creatorProfile?.displayName || '';
    const headline = c.creatorProfile?.headline || '';
    const q = searchTerm.toLowerCase();
    return name.toLowerCase().includes(q) || headline.toLowerCase().includes(q);
  });

  const completion = brandProfile?.profileCompletion || 25;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn text-left">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">
              Brand & Agency Hub
            </Badge>
            <span className="text-xs font-mono text-text-muted">Account: {user?.email}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            {brandProfile?.companyName || user?.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {brandProfile?.industry || 'Digital Media & Marketing'} • {brandProfile?.companySize || '11-50'} Team Members
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={activeTab === 'messages' ? 'primary' : 'secondary'}
            size="md"
            leftIcon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
            onClick={() => switchTab('messages')}
            className={activeTab === 'messages' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20' : ''}
          >
            Messages {totalUnread > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500 text-white font-bold">{totalUnread}</span>}
          </Button>
          <Button
            variant="outline"
            size="md"
            leftIcon={<ExternalLink className="w-4 h-4 text-emerald-400" />}
            onClick={() => setIsChatPopupOpen(true)}
            title="Open centered popup messenger window"
          >
            Popup Chat
          </Button>
          <Link to="/brand/creative-studio">
            <Button variant="outline" size="md" leftIcon={<Sparkles className="w-4 h-4 text-accent animate-pulse" />}>
              AI Creative Studio
            </Button>
          </Link>
          <Link to="/brand/briefs/new">
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              New Brief
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-2">
        <button
          onClick={() => switchTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-surface-elevated text-accent border border-border/80 shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview & Briefs</span>
        </button>

        <button
          onClick={() => switchTab('messages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'messages'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messages</span>
          {totalUnread > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: WHATSAPP-STYLE REAL-TIME CHAT INTERFACE        */}
      {/* ========================================================= */}
      {activeTab === 'messages' && (
        <div className="w-full bg-[#0b141a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[750px] animate-fadeIn">
          
          {/* Left Column: WhatsApp Chats Sidebar */}
          <div className={`w-full md:w-80 lg:w-96 bg-[#111b21] border-r border-[#202c33] flex flex-col shrink-0 ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Sidebar Top Header */}
            <div className="p-4 bg-[#202c33] flex items-center justify-between border-b border-[#2a3942]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700/60 flex items-center justify-center text-white font-bold border border-emerald-500/30">
                  {brandProfile?.companyName?.charAt(0) || user?.name?.charAt(0) || 'B'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Direct Messages</h3>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    WhatsApp Style Live Sync
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchConversationsList}
                title="Refresh conversations"
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#2a3942] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingConversations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-[#111b21] border-b border-[#202c33]">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search or start new chat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#202c33] border-none rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]/60">
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                  <p>Loading messages...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center mx-auto text-slate-500">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-300">No conversations found</p>
                  <p className="text-[11px] text-slate-500">
                    Browse the creator directory and click "Message Creator" to initiate a real-time chat.
                  </p>
                  <Link to="/explore">
                    <Button variant="outline" size="sm" className="mt-2 text-xs">
                      Explore Creators
                    </Button>
                  </Link>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const partnerName = conv.partner?.name || conv.creatorProfile?.displayName || 'Creator';
                  const partnerAvatar = conv.partner?.avatarUrl || conv.creatorProfile?.avatarUrl;
                  const isSelected = selectedConversation?.id === conv.id;
                  const hasUnread = (conv.unreadCount || 0) > 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#2a3942]'
                          : 'hover:bg-[#202c33]/70'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={
                            partnerAvatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                          }
                          alt={partnerName}
                          className="w-12 h-12 rounded-full object-cover border border-[#2a3942]"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111b21]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-slate-100 truncate">
                            {partnerName}
                          </h4>
                          {conv.lastMessageAt && (
                            <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                              {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400 truncate">
                            {conv.lastMessage?.content || 'Conversation started'}
                          </p>
                          {hasUnread && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: WhatsApp Chat Area */}
          <div className={`flex-1 flex flex-col bg-[#0b141a] ${
            !selectedConversation ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="p-3.5 bg-[#202c33] flex items-center justify-between border-b border-[#2a3942] shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden text-slate-400 hover:text-white p-1"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="relative">
                      <img
                        src={
                          selectedConversation.partner?.avatarUrl ||
                          selectedConversation.creatorProfile?.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                        }
                        alt="Creator"
                        className="w-10 h-10 rounded-full object-cover border border-[#2a3942]"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#202c33]" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {selectedConversation.partner?.name ||
                          selectedConversation.creatorProfile?.displayName ||
                          'Creator Partner'}
                      </h3>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online & available for brief inquiries
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedConversation.creatorProfile && (
                      <Link
                        to={`/creators/${selectedConversation.creatorProfile.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2a3942] text-slate-200 hover:text-white hover:bg-[#32424d] transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Messages Stream Container */}
                <div
                  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3"
                  style={{
                    backgroundColor: '#0b141a',
                    backgroundImage:
                      'radial-gradient(circle at 50% 50%, rgba(20, 32, 40, 0.4) 0%, transparent 100%)'
                  }}
                >
                  {/* Date Pill */}
                  <div className="flex justify-center my-2">
                    <span className="px-3 py-1 rounded-lg bg-[#182229] border border-[#202c33] text-[11px] font-mono text-slate-400 shadow-sm">
                      WhatsApp Encrypted Collaboration Stream
                    </span>
                  </div>

                  {isLoadingMessages ? (
                    <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                      <p>Loading message thread...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                      <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="font-semibold text-slate-300">No messages exchanged yet</p>
                      <p className="text-slate-500">Say hello or share brief project expectations!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.id || msg.sender?.role === 'brand';

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <img
                              src={
                                msg.sender?.avatarUrl ||
                                selectedConversation.partner?.avatarUrl ||
                                selectedConversation.creatorProfile?.avatarUrl ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                              }
                              alt={msg.sender?.name || 'Creator'}
                              className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-slate-700"
                            />
                          )}

                          <div
                            className={`relative max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                              isMe
                                ? 'bg-[#005c4b] text-white rounded-tr-none'
                                : 'bg-[#202c33] text-slate-100 rounded-tl-none border border-[#2a3942]'
                            }`}
                          >
                            {/* Sender Name if incoming */}
                            {!isMe && (
                              <p className="text-[11px] font-bold text-emerald-400 mb-1">
                                {msg.sender?.name || 'Creator'}
                              </p>
                            )}

                            {/* Message Text */}
                            <p className="whitespace-pre-wrap leading-relaxed break-words">
                              {msg.content}
                            </p>

                            {/* Time and Blue Checkmarks */}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-300/80 font-mono">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {isMe && (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-[#202c33] border-t border-[#2a3942] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-[#2a3942] border-none rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-all shrink-0"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </form>
              </>
            ) : (
              /* WhatsApp Web Empty State Placeholder */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111b21]">
                <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center mb-4 text-emerald-400 border border-[#2a3942]">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 font-display mb-2">
                  Kampus.VC Direct Messaging
                </h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
                  Send real-time messages, inquire about tailored creative packages, and coordinate creative campaigns directly with verified creators.
                </p>
                <Link to="/explore">
                  <Button variant="primary" size="md" leftIcon={<Search className="w-4 h-4" />}>
                    Explore Creator Directory
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: DASHBOARD OVERVIEW & CAMPAIGN BRIEFS           */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Metrics & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Profile Score */}
            <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-text-muted font-mono">
                    Brand Profile
                  </span>
                  <Badge variant={completion >= 80 ? 'success' : 'warning'} size="sm">
                    {completion}%
                  </Badge>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden mb-3 border border-border">
                  <div
                    className="h-full bg-accent transition-all duration-500 rounded-full"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
              <Link to="/settings" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
                Edit brand information <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>

            {/* Total Campaigns */}
            <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
                  Total Campaigns
                </span>
                <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
                  <Layers className="w-5 h-5 text-accent" />
                  <span>{stats.total} Briefs</span>
                </div>
              </div>
              <Link to="/brand/briefs" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
                View all briefs <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>

            {/* Active Published Campaigns */}
            <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
                  Active in Marketplace
                </span>
                <div className="flex items-center gap-2 text-2xl font-bold text-status-success font-display">
                  <Sparkles className="w-5 h-5" />
                  <span>{stats.published} Live</span>
                </div>
              </div>
              <Link to="/briefs" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
                Explore public directory <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>

            {/* Drafts */}
            <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
                  Draft Briefs
                </span>
                <div className="flex items-center gap-2 text-2xl font-bold text-status-warning font-display">
                  <FileText className="w-5 h-5" />
                  <span>{stats.draft} Incomplete</span>
                </div>
              </div>
              <Link to="/brand/briefs/new" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
                Author new brief <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>
          </div>

          {/* Recent Briefs & Quick Action Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Briefs Table/List */}
            <Card variant="glass" className="p-6 sm:p-8 lg:col-span-2 border-border space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-accent" /> Recent Campaign Briefs
                </h2>
                <Link to="/brand/briefs">
                  <Button variant="secondary" size="sm">
                    View All
                  </Button>
                </Link>
              </div>

              {briefs.length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-elevated/40 border border-border text-center space-y-3">
                  <p className="text-xs text-text-secondary">
                    You have not authored any campaign briefs yet.
                  </p>
                  <Link to="/brand/briefs/new">
                    <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                      Create First Campaign Brief
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {briefs.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-surface-elevated/50 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              b.status === 'published'
                                ? 'success'
                                : b.status === 'draft'
                                ? 'warning'
                                : 'default'
                            }
                            size="sm"
                          >
                            {b.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-text-muted font-mono">{b.category}</span>
                        </div>
                        <h4 className="text-sm font-bold text-text-primary font-display">
                          {b.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <span className="font-mono text-text-secondary">
                          ₹{b.budgetMin.toLocaleString()} – ₹{b.budgetMax.toLocaleString()}
                        </span>
                        <Link to={`/brand/briefs/${b.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Company Details */}
            <Card variant="glass" className="p-6 sm:p-8 border-border flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-3">Company Information</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {brandProfile?.description ||
                    'Add your company story, core values, and creative objectives in Settings to build trust with creators.'}
                </p>

                <div className="mt-4 pt-4 border-t border-border/60 text-xs text-text-muted space-y-1.5">
                  <div>Contact Lead: <strong className="text-text-primary">{brandProfile?.contactName || user?.name}</strong></div>
                  <div>Location: <strong className="text-text-primary">{brandProfile?.location || 'Global Remote'}</strong></div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
                <span className="flex items-center gap-1 text-accent">
                  <ShieldCheck className="w-4 h-4" /> Enterprise Brand Partner
                </span>
                <Link to="/settings" className="text-accent hover:underline font-semibold">
                  Edit Settings →
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Centered Popup Chat Modal */}
      <DirectChatModal
        isOpen={isChatPopupOpen}
        onClose={() => setIsChatPopupOpen(false)}
      />

    </div>
  );
};
