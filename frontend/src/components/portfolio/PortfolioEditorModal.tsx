import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../../types';
import { Button } from '../ui/Button';
import {
  X,
  Image as ImageIcon,
  Video,
  Globe,
  Sparkles,
  AlertCircle,
  UploadCloud,
  Link as LinkIcon,
  Layers,
  Wrench,
  Tag,
  Eye,
  Star,
  ExternalLink,
  Info
} from 'lucide-react';
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
  const [thumbnailMode, setThumbnailMode] = useState<'upload' | 'url'>('upload');
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
      setMediaMode(initialData.assetId ? 'upload' : (initialData.mediaUrl?.startsWith('http') ? 'url' : 'upload'));
      setThumbnailMode(initialData.thumbnailAssetId ? 'upload' : (initialData.thumbnailUrl?.startsWith('http') ? 'url' : 'upload'));
    } else {
      setTitle('');
      setCategory('Generative Art');
      setDescription('');
      setMediaType('image');
      setMediaMode('upload');
      setThumbnailMode('upload');
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
      setError('Please provide an asset title (at least 2 characters).');
      return;
    }

    if (!mediaUrl.trim()) {
      setError('Please upload a creative asset or provide a media URL.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b0f17] border border-slate-700/80 rounded-2xl shadow-2xl text-left overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0e131d]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display tracking-tight">
                {initialData ? 'Edit Creative Asset' : 'Add Creative Asset'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Showcase digital artworks, 3D animations, video reels, and high-fidelity case studies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form id="portfolio-asset-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Card 1: Asset Core Identity */}
          <div className="bg-[#121722] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-slate-200">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Basic Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Asset Title <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cyberpunk Kyoto 2088 — 4K Motion Reel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Creative Domain / Category <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Artistic Description & Concept
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail your creative vision, render setup, lighting cues, prompt methodology, or client objectives..."
                className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
              />
            </div>
          </div>

          {/* Card 2: Main Creative Media */}
          <div className="bg-[#121722] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Primary Creative Asset File</span>
                <span className="text-xs text-cyan-400 font-mono">*</span>
              </div>

              {/* Upload vs URL Toggle */}
              <div className="flex bg-[#181f2e] rounded-lg p-1 border border-slate-700/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMediaMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    mediaMode === 'upload'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" /> File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    mediaMode === 'url'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Direct URL
                </button>
              </div>
            </div>

            {/* Media Format Type Selector */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMediaType('image')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  mediaType === 'image'
                    ? 'bg-cyan-500/15 border-cyan-400/80 text-cyan-300 shadow-sm'
                    : 'bg-[#181f2e] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <ImageIcon className="w-4 h-4" /> High-Res Image
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  mediaType === 'video'
                    ? 'bg-cyan-500/15 border-cyan-400/80 text-cyan-300 shadow-sm'
                    : 'bg-[#181f2e] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Video className="w-4 h-4" /> Video Reel (MP4)
              </button>
              <button
                type="button"
                onClick={() => setMediaType('project')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  mediaType === 'project'
                    ? 'bg-cyan-500/15 border-cyan-400/80 text-cyan-300 shadow-sm'
                    : 'bg-[#181f2e] border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Globe className="w-4 h-4" /> Case Study
              </button>
            </div>

            {mediaMode === 'upload' ? (
              <div className="space-y-2">
                <MediaUploadDropzone
                  category={mediaType === 'video' ? 'video' : 'image'}
                  intendedUse="portfolio"
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
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  Supports JPG, PNG, WebP up to 25MB, or MP4/WebM videos up to 250MB.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Asset Media URL <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    setAssetId(undefined);
                  }}
                  required
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Direct link to your artwork on Cloudinary, S3, Unsplash, Behance, or Vimeo.
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Project Cover Thumbnail */}
          <div className="bg-[#121722] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Cover Poster / Preview Thumbnail</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Showcased on creator cards, marketplace search, and video previews
                </p>
              </div>

              {/* Upload vs URL Toggle */}
              <div className="flex bg-[#181f2e] rounded-lg p-1 border border-slate-700/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setThumbnailMode('upload')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    thumbnailMode === 'upload'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" /> File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    thumbnailMode === 'url'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Direct URL
                </button>
              </div>
            </div>

            {thumbnailMode === 'upload' ? (
              <div className="space-y-2">
                <MediaUploadDropzone
                  category="image"
                  intendedUse="thumbnail"
                  currentUrl={thumbnailUrl}
                  currentAssetId={thumbnailAssetId}
                  label="Upload Thumbnail Poster (JPG, PNG, WebP)"
                  onUploadComplete={(asset, accessUrl) => {
                    setThumbnailAssetId(asset.id);
                    setThumbnailUrl(accessUrl || `/api/media/assets/${asset.id}`);
                  }}
                  onRemove={() => {
                    setThumbnailAssetId(undefined);
                    setThumbnailUrl('');
                  }}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or hosted cover image"
                  value={thumbnailUrl}
                  onChange={(e) => {
                    setThumbnailUrl(e.target.value);
                    setThumbnailAssetId(undefined);
                  }}
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            )}
          </div>

          {/* Card 4: Tools, Tags & Attribution */}
          <div className="bg-[#121722] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-slate-200">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <span>Tools, Tags & Case Study Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Creative Software & AI Models</span>
                </label>
                <input
                  type="text"
                  placeholder="Midjourney v6, Blender, Photoshop, ComfyUI"
                  value={toolsInput}
                  onChange={(e) => setToolsInput(e.target.value)}
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <p className="text-[11px] text-slate-500">Comma-separated software & tools used</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Style & Aesthetic Tags</span>
                </label>
                <input
                  type="text"
                  placeholder="Cyberpunk, 8K Photorealism, Neon, Cinematic"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <p className="text-[11px] text-slate-500">Comma-separated discoverability tags</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Client / Brand Partner (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nike, Red Bull, Personal Exploration"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Case Study / External URL</span>
                </label>
                <input
                  type="url"
                  placeholder="https://behance.net/gallery/... or artstation.com/..."
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="w-full bg-[#181f2e] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Visibility & Featured Showcase */}
          <div className="bg-[#121722] border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono mb-1">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bg-[#181f2e] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="public">Public (Showcased on public profile & search)</option>
                  <option value="unlisted">Unlisted (Accessible only via direct link)</option>
                  <option value="private">Private (Visible only to you)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer bg-[#181f2e] px-4 py-2 rounded-xl border border-slate-700/80 hover:border-cyan-400/50 transition-all">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-400 bg-[#0e131d]"
              />
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Star className={`w-3.5 h-3.5 ${isFeatured ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                <span>Feature on Profile Top</span>
              </span>
            </label>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0e131d]/95 backdrop-blur-md shrink-0">
          <div className="text-xs text-slate-400">
            {mediaUrl ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Media ready to publish
              </span>
            ) : (
              <span className="text-amber-400">
                Upload or link a media asset
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
              className="text-slate-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="portfolio-asset-form"
              variant="primary"
              size="md"
              isLoading={loading}
              className="px-6"
            >
              {initialData ? 'Update Asset' : 'Publish Creative Asset'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
