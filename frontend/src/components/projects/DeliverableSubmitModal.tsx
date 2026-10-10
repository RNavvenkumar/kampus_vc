import React, { useState } from 'react';
import { X, Send, Link as LinkIcon, CheckCircle, Sparkles, Film, Image as ImageIcon, Loader2, Plus } from 'lucide-react';
import { ProjectMilestone, MediaAsset, DeliverableSubmission } from '../../types';
import { submitDeliverable, attachExternalMedia, extractErrorMessage } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MediaUploadDropzone } from '../media/MediaUploadDropzone';

interface DeliverableSubmitModalProps {
  projectId: string;
  milestone: ProjectMilestone;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (submission: DeliverableSubmission) => void;
}

const DEMO_PRESETS = [
  {
    title: '🎬 3D Motion Reel (MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    filename: 'Nike_AirMax_Hero_Motion_Reel_4K.mp4',
    category: 'video' as const
  },
  {
    title: '🖼️ 4K Sneaker Hero Keyframe (PNG)',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&auto=format&fit=crop&q=85',
    filename: 'Nike_AirMax_2027_Keyframe_Render.png',
    category: 'image' as const
  },
  {
    title: '⚡ Cyberpunk Color Pass (PNG)',
    url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1600&auto=format&fit=crop&q=85',
    filename: 'ColorGrade_Turnaround_Shot_01.png',
    category: 'image' as const
  }
];

export const DeliverableSubmitModal: React.FC<DeliverableSubmitModalProps> = ({
  projectId,
  milestone,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [notes, setNotes] = useState(
    `Prepared the initial high-fidelity renders and motion cut for Milestone #${milestone.order}. Incorporates brand color palette, photorealistic lighting, and 4K camera turnarounds.`
  );
  const [externalLinks, setExternalLinks] = useState<string[]>(['https://www.figma.com/file/demo/Nike-AirMax-2027-Deliverables']);
  const [attachedAssets, setAttachedAssets] = useState<{ asset: MediaAsset; accessUrl: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isAttachingUrl, setIsAttachingUrl] = useState(false);
  const [dropzoneKey, setDropzoneKey] = useState(0);

  if (!isOpen) return null;

  const handleLinkChange = (index: number, val: string) => {
    const updated = [...externalLinks];
    updated[index] = val;
    setExternalLinks(updated);
  };

  const addLinkField = () => {
    if (externalLinks.length < 5) {
      setExternalLinks([...externalLinks, '']);
    }
  };

  const removeLinkField = (index: number) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  const handleAssetUploaded = (asset: MediaAsset, accessUrl: string) => {
    setAttachedAssets((prev) => [...prev, { asset, accessUrl }]);
    setDropzoneKey((prev) => prev + 1);
  };

  const handleAttachMediaUrl = async (urlToAttach: string, defaultFilename?: string, defaultCategory?: 'image' | 'video') => {
    if (!urlToAttach || !urlToAttach.trim()) return;
    try {
      setIsAttachingUrl(true);
      setError(null);
      const isVideo = defaultCategory === 'video' || /\.(mp4|webm|mov)$/i.test(urlToAttach);
      const filename = defaultFilename || urlToAttach.split('/').pop()?.split('?')[0] || (isVideo ? 'deliverable-video.mp4' : 'deliverable-preview.png');
      const res = await attachExternalMedia({
        url: urlToAttach.trim(),
        filename,
        category: defaultCategory || (isVideo ? 'video' : 'image'),
        intendedUse: 'project_deliverable'
      });
      setAttachedAssets((prev) => [...prev, { asset: res.asset, accessUrl: res.accessUrl }]);
      setMediaUrlInput('');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to attach media link.'));
    } finally {
      setIsAttachingUrl(false);
    }
  };

  const removeAsset = (assetId: string) => {
    setAttachedAssets((prev) => prev.filter((a) => a.asset.id !== assetId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 3) {
      setError('Please provide notes explaining what is included in this deliverable.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const validLinks = externalLinks
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && (l.startsWith('http://') || l.startsWith('https://')));

      const milestoneId = (milestone.id || milestone._id || '').toString();

      const newSubmission = await submitDeliverable(projectId, milestoneId, {
        submissionNotes: notes.trim(),
        assetIds: attachedAssets.map((a) => a.asset.id),
        externalLinks: validLinks
      });

      onSuccess(newSubmission);
      onClose();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to submit deliverable. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <Card className="w-full max-w-2xl bg-[#0F131C] border-[#1F2937] text-white rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-[#1F2937] flex items-center justify-between bg-gradient-to-r from-emerald-950/20 to-transparent">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Milestone #{milestone.order} Submission
            </span>
            <h2 className="text-xl font-bold text-white mt-1">{milestone.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Agreed Deliverables Checklist */}
          {milestone.deliverables && milestone.deliverables.length > 0 && (
            <div className="p-4 rounded-xl bg-[#090B10] border border-[#1F2937] space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">Deliverables Scope</span>
              <ul className="space-y-1.5 text-xs text-gray-300">
                {milestone.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Submission Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Submission Notes & Walkthrough <span className="text-red-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail what you've prepared in this version, creative choices made, or instructions for the brand client to review..."
              rows={3}
              required
              className="w-full bg-[#161B26] border border-[#2B3545] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Media Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Upload Videos & Photos for Review
              </label>
              {attachedAssets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDropzoneKey((k) => k + 1)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  + Upload Another File
                </button>
              )}
            </div>

            {/* Quick Demo Presets */}
            <div className="p-3 rounded-xl bg-[#121722] border border-[#1F2937] space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Demo Assets (1-Click Attach for Instant Testing):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEMO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAttachMediaUrl(preset.url, preset.filename, preset.category)}
                    disabled={isAttachingUrl}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400 transition-all flex items-center gap-1.5"
                  >
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Media URL Input */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="Or paste direct image / video URL (e.g. https://...)"
                className="flex-1 bg-[#161B26] border border-[#2B3545] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAttachMediaUrl(mediaUrlInput)}
                disabled={!mediaUrlInput.trim() || isAttachingUrl}
                className="shrink-0"
              >
                {isAttachingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Attach URL
              </Button>
            </div>

            {/* Media Upload Dropzone */}
            <MediaUploadDropzone
              key={dropzoneKey}
              onUploadComplete={handleAssetUploaded}
              category="all"
              intendedUse="project_deliverable"
              label="Drop deliverable image (PNG, JPG) or video reel (MP4, MOV)"
            />

            {/* Attached Assets Gallery */}
            {attachedAssets.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-xs text-gray-400 font-medium">
                  {attachedAssets.length} deliverable file(s) ready to send:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedAssets.map(({ asset, accessUrl }) => {
                    const isVid = asset.category === 'video' || asset.mimeType?.startsWith('video/');
                    const url = accessUrl || asset.accessUrl || '';
                    return (
                      <div
                        key={asset.id}
                        className="p-2.5 rounded-lg bg-[#161B26] border border-emerald-500/30 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isVid ? (
                            <div className="w-9 h-9 rounded bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-emerald-400" />
                            </div>
                          ) : url ? (
                            <img
                              src={url}
                              alt=""
                              className="w-9 h-9 rounded object-cover bg-black/40 border border-white/10 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center shrink-0">
                              <ImageIcon className="w-4 h-4 text-emerald-400" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-gray-200 font-medium truncate">{asset.originalFilename}</p>
                            <p className="text-[10px] text-gray-400">
                              {asset.category === 'video' ? '🎬 Video Render' : '🖼️ Image Keyframe'} • {asset.mimeType?.split('/')[1]?.toUpperCase() || 'MEDIA'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAsset(asset.id)}
                          className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* External Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                External Project Links (Figma, GitHub, Loom, Drive)
              </label>
              {externalLinks.length < 5 && (
                <button
                  type="button"
                  onClick={addLinkField}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  + Add Link
                </button>
              )}
            </div>
            <div className="space-y-2">
              {externalLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => handleLinkChange(idx, e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#161B26] border border-[#2B3545] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {externalLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLinkField(idx)}
                      className="p-2 text-gray-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-[#1F2937] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <span>Submitting Deliverable...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  Submit for Brand Review
                </span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
