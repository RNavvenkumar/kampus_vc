import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CampaignProposal } from '../../types';
import {
  getBrandProposalById,
  shortlistProposal,
  requestRevision,
  acceptProposal,
  declineProposal,
  extractErrorMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft,
  AlertCircle,
  Sparkles,
  User,
  Check,
  Star,
  MessageSquare,
  XCircle,
  Award,
  ShieldCheck
} from 'lucide-react';

export const BrandProposalReviewDetailPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();

  const [proposal, setProposal] = useState<CampaignProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  const fetchProposal = async () => {
    if (!proposalId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getBrandProposalById(proposalId);
      setProposal(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load proposal details for review.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  const handleShortlist = async () => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      const updated = await shortlistProposal(proposal.id);
      setProposal((prev) => (prev ? { ...prev, status: updated.status } : null));
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to shortlist proposal.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || revisionFeedback.trim().length < 5) {
      alert('Please provide at least 5 characters of feedback for the creator.');
      return;
    }

    try {
      setActionLoading(true);
      const updated = await requestRevision(proposal.id, revisionFeedback.trim());
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              revisionMessage: updated.revisionMessage
            }
          : null
      );
      setShowRevisionModal(false);
      setRevisionFeedback('');
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to request revisions.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      await acceptProposal(proposal.id);
      setShowAcceptModal(false);
      navigate('/projects');
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to accept proposal and award project.'));
      fetchProposal();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineProposal = async () => {
    if (!proposal) return;
    try {
      setActionLoading(true);
      const updated = await declineProposal(proposal.id);
      setProposal((prev) => (prev ? { ...prev, status: updated.status } : null));
      setShowDeclineModal(false);
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to decline proposal.'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Awarded & Accepted</Badge>;
      case 'shortlisted':
        return <Badge variant="cyan">Shortlisted</Badge>;
      case 'submitted':
        return <Badge variant="outline">New Submission</Badge>;
      case 'revision_requested':
        return <Badge variant="warning">Revision Pending</Badge>;
      case 'declined':
        return <Badge variant="error">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white flex items-center justify-center py-24">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#58D5FF]/30 border-t-[#58D5FF] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading proposal details for review...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Proposal Review Unavailable</h2>
          <p className="text-gray-400 text-sm">{error || 'The requested proposal does not exist or access is restricted.'}</p>
          <Link to="/brand/proposals">
            <Button variant="primary">Return to Review Center</Button>
          </Link>
        </div>
      </div>
    );
  }

  const brief = (proposal.brief || proposal.briefId) as any;
  const creatorProfile = proposal.creatorProfile as any;
  const creatorUser = (proposal.creator || proposal.creatorId) as any;
  const displayName = creatorProfile?.displayName || creatorUser?.name || 'Creator';
  const isAccepted = proposal.status === 'accepted';
  const canDecide = ['submitted', 'shortlisted'].includes(proposal.status);

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <Link
              to="/brand/proposals"
              className="inline-flex items-center text-sm text-gray-400 hover:text-[#58D5FF] transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Proposal Review Center
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">
                {proposal.pitchTitle || `Proposal by ${displayName}`}
              </h1>
              {getStatusBadge(proposal.status)}
              <span className="text-xs text-gray-500 font-mono">{proposal.proposalReference}</span>
            </div>
            {brief && (
              <p className="text-sm text-gray-400 mt-1">
                Campaign: <strong className="text-white">{brief.title}</strong>
              </p>
            )}
          </div>

          {/* Action Decision Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canDecide && (
              <>
                {proposal.status !== 'shortlisted' && (
                  <Button
                    variant="outline"
                    disabled={actionLoading}
                    onClick={handleShortlist}
                    className="flex items-center gap-1.5 text-xs py-2 border-[#1F2937] hover:border-[#58D5FF]"
                  >
                    <Star className="w-3.5 h-3.5 text-purple-400" />
                    <span>Shortlist</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setShowRevisionModal(true)}
                  className="flex items-center gap-1.5 text-xs py-2 border-amber-800/60 text-amber-300 hover:bg-amber-950/30"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Request Revisions</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setShowDeclineModal(true)}
                  className="flex items-center gap-1.5 text-xs py-2 border-rose-800/60 text-rose-300 hover:bg-rose-950/30"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Decline</span>
                </Button>

                <Button
                  variant="primary"
                  disabled={actionLoading}
                  onClick={() => setShowAcceptModal(true)}
                  className="flex items-center gap-1.5 text-xs py-2 bg-emerald-600 hover:bg-emerald-500 font-bold shadow-lg shadow-emerald-500/10"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Accept & Award Project</span>
                </Button>
              </>
            )}

            {isAccepted && (
              <Link to="/projects">
                <Button variant="primary" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-xs py-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>View Project Workspace</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Explainable Creator Compatibility Box */}
        {proposal.compatibility && (
          <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#58D5FF]" />
                <h3 className="text-base font-bold text-white">Explainable Creator Compatibility Analysis</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Calculated Compatibility:</span>
                <Badge variant="cyan" size="sm">{proposal.compatibility.matchPercentage}% Alignment</Badge>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs text-gray-300">
              {proposal.compatibility.notes?.map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#58D5FF] mt-1.5 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 italic pt-1">
              * Heuristic score calculated from verified creator specialties, declared tools, and budget fit. Kampus.VC does not fabricate unverified AI metrics.
            </p>
          </Card>
        )}

        {/* Creator Identity Card */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {creatorProfile?.avatarUrl ? (
                <img
                  src={creatorProfile.avatarUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#1F2937]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400">
                  <User className="w-8 h-8" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{displayName}</h3>
                {creatorProfile?.headline && (
                  <p className="text-sm text-gray-300 mt-0.5">{creatorProfile.headline}</p>
                )}
                {creatorProfile?.location && (
                  <p className="text-xs text-gray-400 mt-1">{creatorProfile.location}</p>
                )}
              </div>
            </div>

            {creatorProfile?.specialties && creatorProfile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-w-sm">
                {creatorProfile.specialties.map((s: string, i: number) => (
                  <Badge key={i} variant="outline" size="sm" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Commercial Terms Snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 uppercase font-medium">Proposed Price</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              ${proposal.proposedPrice?.toLocaleString()} {proposal.currency}
            </p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 uppercase font-medium">Turnaround Duration</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {proposal.deliveryDurationWeeks} Weeks
            </p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 uppercase font-medium">Revision Allowance</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {proposal.revisionAllowance} Rounds
            </p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 uppercase font-medium">Proposal Version</p>
            <p className="text-2xl font-extrabold text-[#58D5FF] mt-1">
              v{proposal.revisionNumber || 1}
            </p>
          </Card>
        </div>

        {/* Pitch Message */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
            Creator Pitch & Methodology
          </h3>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
            {proposal.pitchMessage}
          </p>
        </Card>

        {/* Deliverables Scope */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
            Proposed Deliverables
          </h3>
          <ul className="space-y-2.5">
            {proposal.deliverables?.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#58D5FF]/10 text-[#58D5FF] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Milestone Plan */}
        {proposal.milestones && proposal.milestones.length > 0 && (
          <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <h3 className="text-lg font-bold text-white">Milestone Plan</h3>
              <span className="text-xs text-gray-400">{proposal.milestones.length} milestones total</span>
            </div>
            <div className="space-y-3">
              {proposal.milestones.map((m, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-[#090B10] border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-semibold text-[#58D5FF] uppercase">Milestone #{m.order}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{m.title}</h4>
                    {m.description && <p className="text-xs text-gray-400 mt-1">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {m.durationWeeks && (
                      <span className="text-gray-400">{m.durationWeeks} weeks</span>
                    )}
                    {m.amount !== undefined && (
                      <span className="font-bold text-emerald-400 text-sm">
                        ${m.amount?.toLocaleString()} {proposal.currency}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Referenced Portfolio Evidence */}
        {proposal.referencedPortfolio && proposal.referencedPortfolio.length > 0 && (
          <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
              Referenced Portfolio Evidence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposal.referencedPortfolio.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-[#090B10] border border-[#1F2937] space-y-2">
                  {item.mediaUrl && (
                    <img
                      src={item.mediaUrl}
                      alt={item.title}
                      className="w-full h-32 object-cover rounded border border-[#1F2937]"
                    />
                  )}
                  <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151D] border border-[#1F2937] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <span>Request Proposal Revision</span>
              </h3>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestRevisionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Revision Feedback & Adjustments Needed <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={5}
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="Specify adjustments to scope, delivery timeline, deliverables, or commercial terms..."
                  className="w-full bg-[#090B10] border border-[#1F2937] rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#58D5FF]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRevisionModal(false)}
                  className="border-[#1F2937]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={actionLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                >
                  Send Revision Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Proposal Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151D] border border-[#1F2937] rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-emerald-400" />
                <span>Confirm Proposal Award</span>
              </h3>
              <button onClick={() => setShowAcceptModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 rounded-lg bg-[#090B10] border border-[#1F2937] space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-[#1F2937] pb-2">
                <span className="text-gray-400">Awarded Creator:</span>
                <span className="font-bold text-white">{displayName}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-[#1F2937] pb-2">
                <span className="text-gray-400">Agreed Total Price:</span>
                <span className="font-bold text-emerald-400 text-base">
                  ${proposal.proposedPrice?.toLocaleString()} {proposal.currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-[#1F2937] pb-2">
                <span className="text-gray-400">Timeline:</span>
                <span className="font-medium text-white">{proposal.deliveryDurationWeeks} Weeks</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Deliverables Count:</span>
                <span className="font-medium text-white">{proposal.deliverables?.length || 0} items</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 space-y-1">
              <p className="font-bold text-amber-400">Single-Winner Business Invariant:</p>
              <p>
                Accepting this proposal claims the campaign award exclusively, permanently locks these agreed terms into an immutable agreement snapshot, transitions any remaining competing proposals to declined, and creates an active Project workspace.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAcceptModal(false)}
                className="border-[#1F2937]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={actionLoading}
                onClick={handleAcceptProposal}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                {actionLoading ? 'Awarding Project...' : 'Confirm & Award Project'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Proposal Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151D] border border-[#1F2937] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Decline Proposal</h3>
            <p className="text-sm text-gray-300">
              Are you sure you want to decline this proposal by <strong>{displayName}</strong>? The creator will be notified of your decision.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDeclineModal(false)} className="border-[#1F2937]">
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={actionLoading}
                onClick={handleDeclineProposal}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
