import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Download,
  Image as ImageIcon,
  Film,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { ProjectMessage, MediaAsset } from '../../types';
import {
  getProjectMessages,
  sendProjectMessage,
  extractErrorMessage
} from '../../services/api';
import { Button } from '../ui/Button';
import { MediaUploadDropzone } from '../media/MediaUploadDropzone';

interface ProjectChatBoxProps {
  projectId: string;
  currentUserId: string;
}

export const ProjectChatBox: React.FC<ProjectChatBoxProps> = ({
  projectId,
  currentUserId
}) => {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<{ asset: MediaAsset; accessUrl: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getProjectMessages(projectId, 100);
      setMessages(data || []);
      if (!silent) {
        setTimeout(() => scrollToBottom('auto'), 100);
      }
    } catch (err: any) {
      if (!silent) setError(extractErrorMessage(err, 'Failed to load messages.'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // 6-second polling for active project collaboration chat
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && stagedAssets.length === 0) return;

    try {
      setSending(true);
      setError(null);

      const newMsg = await sendProjectMessage(projectId, {
        content: inputText.trim(),
        assetIds: stagedAssets.map((a) => a.asset.id)
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setStagedAssets([]);
      setShowUploader(false);
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAssetUploaded = (asset: MediaAsset, accessUrl: string) => {
    setStagedAssets((prev) => [...prev, { asset, accessUrl }]);
  };

  const removeStagedAsset = (assetId: string) => {
    setStagedAssets((prev) => prev.filter((a) => a.asset.id !== assetId));
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#0B0E14] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-[#1F2937] bg-[#11151D] flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">Project Workspace Chat</h3>
          <p className="text-xs text-gray-400">Secure direct collaboration between creator and brand</p>
        </div>
        <button
          onClick={() => fetchMessages()}
          title="Refresh messages"
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border-b border-red-500/50 text-red-200 text-xs px-6">
          {error}
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-sm">Start the conversation</h4>
            <p className="text-xs text-gray-400 max-w-sm">
              Coordinate milestone kickoffs, share project references, or discuss feedback directly here.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderId = (msg.senderId as any)?._id || (msg.senderId as any)?.id || msg.senderId;
            const isMe = senderId === currentUserId;
            const senderName = (msg.senderId as any)?.name || (msg.senderRole === 'creator' ? 'Creator' : 'Brand Client');

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isMe
                      ? 'bg-emerald-500 text-white'
                      : msg.senderRole === 'creator'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-purple-600 text-white'
                  }`}
                >
                  {senderName[0]?.toUpperCase() || 'U'}
                </div>

                <div className={`space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender & timestamp header */}
                  <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-gray-300">{isMe ? 'You' : senderName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider bg-gray-800 text-gray-400">
                      {msg.senderRole}
                    </span>
                    <span className="text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-white rounded-tr-none'
                        : 'bg-[#161B26] border border-[#2B3545] text-gray-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                        {msg.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-black/30 border border-white/10 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {att.category === 'video' ? (
                                <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className="truncate">{att.filename}</span>
                            </div>
                            {att.accessUrl && (
                              <a
                                href={att.accessUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 hover:text-emerald-400 text-gray-400 shrink-0"
                                title="Download / View"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Staged Attachments Drawer */}
      {stagedAssets.length > 0 && (
        <div className="p-3 bg-[#11151D] border-t border-[#1F2937] flex flex-wrap gap-2">
          {stagedAssets.map(({ asset }) => (
            <div
              key={asset.id}
              className="px-2.5 py-1.5 rounded-lg bg-[#161B26] border border-[#2B3545] text-xs text-gray-200 flex items-center gap-2"
            >
              <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[150px]">{asset.originalFilename}</span>
              <button
                type="button"
                onClick={() => removeStagedAsset(asset.id)}
                className="text-gray-400 hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Media Uploader Dropzone Toggle */}
      {showUploader && (
        <div className="p-4 bg-[#11151D] border-t border-[#1F2937]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300">Attach Secure Media Asset</span>
            <button
              onClick={() => setShowUploader(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <MediaUploadDropzone
            onUploadComplete={handleAssetUploaded}
            category="all"
            label="Upload file for message attachment"
          />
        </div>
      )}

      {/* Chat Composer */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#11151D] border-t border-[#1F2937] flex items-end gap-3">
        <button
          type="button"
          onClick={() => setShowUploader(!showUploader)}
          title="Attach file from object storage"
          className={`p-3 rounded-xl border transition-colors shrink-0 ${
            showUploader || stagedAssets.length > 0
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
              : 'bg-[#161B26] border-[#2B3545] text-gray-400 hover:text-white'
          }`}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write message... (Press Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 bg-[#161B26] border border-[#2B3545] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none max-h-24 overflow-y-auto"
        />

        <Button
          type="submit"
          variant="primary"
          disabled={sending || (!inputText.trim() && stagedAssets.length === 0)}
          className="shrink-0 h-[46px] px-4"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
};
