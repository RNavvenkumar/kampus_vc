import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { X, Image as ImageIcon, Video, Globe, Sparkles, AlertCircle, UploadCloud, Link as LinkIcon } from 'lucide-react';
import { MediaUploadDropzone } from '../media/MediaUploadDropzone';

interface PortfolioEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Partial<PortfolioItem>) => Promise<void>;
  initialData?: PortfolioItem | null;
}

const CATEGORIES = [
  'Generative Art',
  '3D Motion & VFX',
  'Visual Identity & Branding',
  'Generative Video & Film',
  'Digital Illustration',
  'Sound & Music Design',
  'UI/UX & Interactive',
  'Concept Art'
];

export const PortfolioEditorModal: React.FC<PortfolioEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Generative Art');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'project'>('image');
  const [mediaMode, setMediaMode] = useState<'upload' | 'url'>('upload');
  const [mediaUrl, setMediaUrl] = useState('');
  const [assetId, setAssetId] = useState<string | undefined>(undefined);
  const [thumbnailAssetId, setThumbnailAssetId] = useState<string | undefined>(undefined);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [toolsInput, setToolsInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'Generative Art');
      setDescription(initialData.description || '');
      setMediaType(initialData.mediaType || 'image');
      setMediaUrl(initialData.mediaUrl || '');
      setAssetId(initialData.assetId);
      setThumbnailAssetId(initialData.thumbnailAssetId);
      setThumbnailUrl(initialData.thumbnailUrl || '');
      setProjectUrl(initialData.projectUrl || '');
      setClientName(initialData.clientName || '');
      setCompletionDate(initialData.completionDate ? initialData.completionDate.substring(0, 10) : '');
      setTagsInput(initialData.tags ? initialData.tags.join(', ') : '');
      setToolsInput(initialData.creativeTools ? initialData.creativeTools.join(', ') : '');
      setIsFeatured(!!initialData.isFeatured);
      setVisibility(initialData.visibility || 'public');
      setMediaMode(initialData.assetId ? 'upload' : (initialData.mediaUrl.startsWith('http') ? 'url' : 'upload'));
    } else {
      setTitle('');
      setCategory('Generative Art');
      setDescription('');
      setMediaType('image');
      setMediaMode('upload');
      setMediaUrl('');
      setAssetId(undefined);
      setThumbnailAssetId(undefined);
      setThumbnailUrl('');
      setProjectUrl('');
      setClientName('');
      setCompletionDate('');
      setTagsInput('');
      setToolsInput('');
      setIsFeatured(false);
      setVisibility('public');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 2) {
      setError('Title must be at least 2 characters long.');
      return;
    }

    if (!mediaUrl.trim()) {
      setError('Please upload an artwork or provide a valid media URL.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const creativeTools = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      setLoading(true);
      await onSave({
        title: title.trim(),
        category,
        description: description.trim(),
        mediaType,
        mediaUrl: mediaUrl.trim(),
        assetId: assetId || undefined,
        thumbnailAssetId: thumbnailAssetId || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        projectUrl: projectUrl.trim() || undefined,
        clientName: clientName.trim() || undefined,
        completionDate: completionDate ? completionDate : undefined,
        tags,
        creativeTools,
        isFeatured,
        visibility
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to save portfolio item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              {initialData ? 'Edit Portfolio Asset' : 'Add Creative Asset'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Showcase high-resolution visuals, project case studies, and creative artifacts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-2 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Asset Title *"
              placeholder="e.g. Cyberpunk Kyoto 2088"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Media Type & Mode Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono">
                Creative Asset Media *
              </label>
              <div className="flex bg-surface-elevated rounded-lg p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => setMediaMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    mediaMode === 'upload'
                      ? 'bg-accent/20 text-accent font-semibold shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Direct Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    mediaMode === 'url'
                      ? 'bg-accent/20 text-accent font-semibold shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> External URL
                </button>
              </div>
            </div>

            {/* Media Type Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  mediaType === 'image'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface-elevated border-border text-text-muted hover:text-text-primary'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  mediaType === 'video'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface-elevated border-border text-text-muted hover:text-text-primary'
                }`}
              >
                <Video className="w-4 h-4" /> Video Reel
              </button>
              <button
                type="button"
                onClick={() => setMediaType('project')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  mediaType === 'project'
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface-elevated border-border text-text-muted hover:text-text-primary'
                }`}
              >
                <Globe className="w-4 h-4" /> Case Study
              </button>
            </div>

            {mediaMode === 'upload' ? (
              <MediaUploadDropzone
                category={mediaType === 'video' ? 'video' : 'image'}
                currentUrl={mediaUrl}
                currentAssetId={assetId}
                label=""
                onUploadComplete={(asset, accessUrl) => {
                  setAssetId(asset.id);
                  setMediaUrl(accessUrl || `/api/media/assets/${asset.id}`);
                  if (asset.category === 'video') {
                    setMediaType('video');
                  } else {
                    setMediaType('image');
                  }
                }}
                onRemove={() => {
                  setAssetId(undefined);
                  setMediaUrl('');
                }}
              />
            ) : (
              <Input
                placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value);
                  setAssetId(undefined);
                }}
                helperText="Hosted media URL (Unsplash, ArtStation, Behance, Vimeo, or YouTube link)"
                required
              />
            )}

            {(mediaType === 'video' || /\.(mp4|webm|mov|ogg|m4v)/i.test(mediaUrl)) && (
              <div className="pt-2">
                <Input
                  label="Thumbnail / Poster Image URL (Optional)"
                  placeholder="https://images.unsplash.com/... (image displayed before video plays)"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  helperText="Recommended for video cards and featured preview thumbnails"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
              Project Description & Context
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your creative process, prompts, lighting, or client requirements..."
              className="w-full bg-surface-elevated border border-border rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
            />
          </div>

          {/* Tags & Tools */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Style Tags"
              placeholder="Cyberpunk, Photorealism, Macro"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              helperText="Comma-separated keywords"
            />
            <Input
              label="Creative Software / AI Tools"
              placeholder="Midjourney v6, Photoshop, ComfyUI"
              value={toolsInput}
              onChange={(e) => setToolsInput(e.target.value)}
              helperText="Comma-separated tools"
            />
          </div>

          {/* Client Name & Project URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Client Name (Optional)"
              placeholder="e.g. Nike, Sony Music, Indie Studio"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <Input
              label="Live Project / Case Study URL"
              placeholder="https://behance.net/gallery/..."
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
            />
          </div>

          {/* Visibility & Featured Toggle */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/60">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase font-mono mb-1">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="public">Public (Visible on profile)</option>
                  <option value="unlisted">Unlisted (Direct link only)</option>
                  <option value="private">Private (Only you)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent bg-surface-elevated"
                />
                <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
                  <Badge variant="cyan" size="sm">Featured Project</Badge>
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-3 sm:pt-0">
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={loading}>
                {initialData ? 'Update Asset' : 'Publish Asset'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
