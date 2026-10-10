import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Paperclip, ExternalLink, Download, Star } from 'lucide-react';
import { DeliverableSubmission } from '../../types';
import { reviewSubmission, extractErrorMessage } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface SubmissionReviewModalProps {
  projectId: string;
  submission: DeliverableSubmission;
  milestoneTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSubmission: DeliverableSubmission, milestoneStatus: string) => void;
}

export const SubmissionReviewModal: React.FC<SubmissionReviewModalProps> = ({
  projectId,
  submission,
  milestoneTitle,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reviewAction, setReviewAction] = useState<'approve' | 'request_revision'>('approve');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReview = async () => {
    if (reviewAction === 'request_revision' && (!feedback.trim() || feedback.trim().length < 5)) {
      setError('Please provide detailed feedback (at least 5 characters) explaining the revisions needed.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await reviewSubmission(projectId, submission.id, {
        action: reviewAction,
        feedback: reviewAction === 'approve' ? (reviewText.trim() || feedback.trim() || 'Approved') : feedback.trim(),
        rating: reviewAction === 'approve' ? rating : undefined,
        review: reviewAction === 'approve' ? (reviewText.trim() || feedback.trim() || 'Work delivered as requested.') : undefined
      });

      onSuccess(res.submission, res.milestoneStatus);
      onClose();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to complete review.'));
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Review Deliverable v{submission.version}
              </span>
              <Badge variant="warning">Awaiting Brand Decision</Badge>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{milestoneTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Submission Walkthrough & Notes */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">Creator Notes & Walkthrough</span>
            <div className="p-4 rounded-xl bg-[#161B26] border border-[#2B3545] text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {submission.submissionNotes}
            </div>
          </div>

          {/* Submitted Files & Media */}
          {submission.attachments && submission.attachments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">
                Submitted Files ({submission.attachments.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {submission.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#161B26] border border-[#2B3545] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-white truncate">{att.filename}</p>
                        <p className="text-gray-400 text-[10px]">
                          {(att.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • {att.category}
                        </p>
                      </div>
                    </div>
                    {att.accessUrl && (
                      <a
                        href={att.accessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                        title="Download / View Asset"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links */}
          {submission.externalLinks && submission.externalLinks.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">External Links</span>
              <div className="space-y-1.5">
                {submission.externalLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-[#161B26] border border-[#2B3545] text-xs text-cyan-400 hover:text-cyan-300 hover:underline truncate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{link}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Decision Selection */}
          <div className="space-y-3 pt-2 border-t border-[#1F2937]">
            <span className="text-xs font-semibold text-gray-300 uppercase">Your Review Decision</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReviewAction('approve')}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'bg-[#161B26] border-[#2B3545] text-gray-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Deliverable
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('request_revision')}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${
                  reviewAction === 'request_revision'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 ring-2 ring-amber-500/20'
                    : 'bg-[#161B26] border-[#2B3545] text-gray-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Request Revision
              </button>
            </div>
          </div>

          {/* Rating and Review for Approval */}
          {reviewAction === 'approve' ? (
            <div className="space-y-4 p-4 rounded-xl bg-[#161B26]/80 border border-emerald-500/20">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Rate Deliverable & Creator Experience (Out of 5)
                  </label>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {rating}.0 / 5.0 Stars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 p-2 bg-[#0B0F17] rounded-xl border border-[#2B3545]">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = (hoverRating !== null ? hoverRating : rating) >= starVal;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-1.5 rounded-lg hover:scale-110 transition-transform focus:outline-none"
                          title={`${starVal} Star${starVal > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              isFilled
                                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : 'text-gray-600 hover:text-gray-400'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs text-gray-400 pl-2">
                    {rating === 5 && '🌟 Exceptional — Exceeded expectations'}
                    {rating === 4 && '✨ Great — High quality deliverable'}
                    {rating === 3 && '👍 Good — Met project requirements'}
                    {rating === 2 && '⚠️ Fair — Needed substantial revisions'}
                    {rating === 1 && '❌ Poor — Did not meet expectations'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Written Review & Feedback
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share a short review on the creative quality, communication, and turnaround speed..."
                  rows={3}
                  className="w-full bg-[#0B0F17] border border-[#2B3545] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Revision Feedback & Action Items <span className="text-red-400">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Specify exactly what needs adjustment, timestamp references for video, or styling edits..."
                rows={3}
                className="w-full bg-[#161B26] border border-[#2B3545] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#1F2937] flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={reviewAction === 'approve' ? 'primary' : 'danger'}
              onClick={handleReview}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Processing...'
                : reviewAction === 'approve'
                ? 'Confirm Deliverable Approval'
                : 'Send Revision Request'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
