import React, { useState } from 'react';
import { X, Send, Link as LinkIcon, Paperclip, CheckCircle } from 'lucide-react';
import { ProjectMilestone, MediaAsset, DeliverableSubmission } from '../../types';
import { submitDeliverable, extractErrorMessage } from '../../services/api';
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

export const DeliverableSubmitModal: React.FC<DeliverableSubmitModalProps> = ({
  projectId,
  milestone,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [notes, setNotes] = useState('');
  const [externalLinks, setExternalLinks] = useState<string[]>(['']);
  const [attachedAssets, setAttachedAssets] = useState<{ asset: MediaAsset; accessUrl: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-2xl bg-[#0F131C] border-[#1F2937] text-white rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-[#1F2937] flex items-center justify-between">
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
              rows={4}
              required
              className="w-full bg-[#161B26] border border-[#2B3545] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Media File Upload (Dropzone) */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Upload Files or Video Render (Cloud Storage)
            </label>
            <MediaUploadDropzone
              onUploadComplete={handleAssetUploaded}
              category="all"
              label="Drop artwork or video deliverables"
            />

            {/* Attached Assets List */}
            {attachedAssets.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-xs text-gray-400 font-medium">
                  {attachedAssets.length} file(s) attached to this deliverable:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedAssets.map(({ asset }) => (
                    <div
                      key={asset.id}
                      className="p-2.5 rounded-lg bg-[#161B26] border border-[#2B3545] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-gray-200 truncate">{asset.originalFilename}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.id)}
                        className="text-gray-400 hover:text-red-400 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
