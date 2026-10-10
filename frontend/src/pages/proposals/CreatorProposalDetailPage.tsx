import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CampaignProposal } from '../../types';
import { getProposalById, withdrawProposal, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft,
  AlertCircle,
  Edit,
  Sparkles,
  Info,
  Check,
  Play
} from 'lucide-react';

const isVideoMedia = (url?: string, type?: string) => {
  if (type === 'video') return true;
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/');
};

export const CreatorProposalDetailPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();

  const [proposal, setProposal] = useState<CampaignProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchProposal() {
      if (!proposalId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getProposalById(proposalId);
        setProposal(data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load proposal details.'));
      } finally {
        setLoading(false);
      }
    }

    fetchProposal();
  }, [proposalId]);

  const handleWithdraw = async () => {
    if (!proposal || !window.confirm('Are you sure you want to withdraw this proposal?')) {
      return;
    }
    try {
      setActionLoading(true);
      const updated = await withdrawProposal(proposal.id);
      setProposal(updated);
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to withdraw proposal.'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Accepted & Awarded</Badge>;
      case 'shortlisted':
        return <Badge variant="cyan">Shortlisted</Badge>;
      case 'submitted':
        return <Badge variant="cyan">Under Brand Review</Badge>;
      case 'revision_requested':
        return <Badge variant="warning">Revision Requested</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'declined':
        return <Badge variant="error">Declined</Badge>;
      case 'withdrawn':
        return <Badge variant="outline">Withdrawn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white flex items-center justify-center py-24">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#58D5FF]/30 border-t-[#58D5FF] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading proposal details...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold">Proposal Not Found</h2>
          <p className="text-gray-400 text-sm">{error || 'The requested proposal does not exist.'}</p>
          <Link to="/creator/proposals">
            <Button variant="primary">Return to Proposals</Button>
          </Link>
        </div>
      </div>
    );
  }

  const brief = (proposal.brief || proposal.briefId) as any;
  const isRevision = proposal.status === 'revision_requested';
  const isDraft = proposal.status === 'draft';
  const isAccepted = proposal.status === 'accepted';
  const canWithdraw = ['submitted', 'shortlisted', 'revision_requested', 'draft'].includes(proposal.status);

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <Link
              to="/creator/proposals"
              className="inline-flex items-center text-sm text-gray-400 hover:text-[#58D5FF] transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Proposals
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">
                {proposal.pitchTitle || 'Proposal Details'}
              </h1>
              {getStatusBadge(proposal.status)}
              <span className="text-xs text-gray-500 font-mono">{proposal.proposalReference}</span>
            </div>
            {brief && (
              <p className="text-sm text-gray-400 mt-1">
                For campaign: <strong className="text-white">{brief.title}</strong> ({brief.companyName || 'Brand'})
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(isDraft || isRevision) && (
              <Link to={`/creator/proposals/${proposal.id}/edit`}>
                <Button variant="primary" className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  <span>{isRevision ? 'Revise & Resubmit' : 'Edit Draft'}</span>
                </Button>
              </Link>
            )}

            {isAccepted && (
              <Link to="/projects">
                <Button variant="primary" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500">
                  <Sparkles className="w-4 h-4" />
                  <span>Open Project Workspace</span>
                </Button>
              </Link>
            )}

            {canWithdraw && (
              <Button
                variant="outline"
                disabled={actionLoading}
                onClick={handleWithdraw}
                className="text-gray-400 hover:text-red-400 border-[#1F2937]"
              >
                Withdraw Proposal
              </Button>
            )}
          </div>
        </div>

        {/* Accepted Terms Snapshot Alert */}
        {isAccepted && proposal.acceptedAgreementSnapshot && (
          <div className="p-6 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-100 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-lg">
              <Sparkles className="w-5 h-5" />
              <span>Project Awarded & Accepted Agreement Frozen</span>
            </div>
            <p className="text-sm text-emerald-200/90 leading-relaxed">
              Congratulations! Your proposal was accepted by the brand. The agreed price (${proposal.acceptedAgreementSnapshot.agreedPrice} {proposal.acceptedAgreementSnapshot.currency}), deliverables, and timeline are permanently locked in the immutable project agreement snapshot.
            </p>
          </div>
        )}

        {/* Revision Feedback Banner */}
        {isRevision && proposal.revisionMessage && (
          <div className="p-6 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-100 space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-lg">
              <Info className="w-5 h-5" />
              <span>Brand Negotiation: Revision Requested</span>
            </div>
            <div className="bg-[#11151D]/80 p-4 rounded-lg border border-amber-800/40 text-sm leading-relaxed">
              "{proposal.revisionMessage}"
            </div>
            <div className="flex justify-end pt-1">
              <Link to={`/creator/proposals/${proposal.id}/edit`}>
                <Button variant="primary" className="text-xs py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                  Update Scope & Resubmit
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Commercial Terms Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Proposed Price</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              ${proposal.proposedPrice?.toLocaleString()} {proposal.currency}
            </p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Estimated Timeline</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {proposal.deliveryDurationWeeks} Weeks
            </p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Revision Allowance</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              {proposal.revisionAllowance} Cycles
            </p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Proposal Version</p>
            <p className="text-2xl font-extrabold text-[#58D5FF] mt-1">
              v{proposal.revisionNumber || 1}
            </p>
          </Card>
        </div>

        {/* Pitch Message */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
            Creative Pitch & Approach
          </h3>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
            {proposal.pitchMessage}
          </p>
        </Card>

        {/* Deliverables Scope */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
            Agreed Deliverables Scope
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

        {/* Attached Portfolio Evidence */}
        {proposal.referencedPortfolio && proposal.referencedPortfolio.length > 0 && (
          <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-[#1F2937] pb-3">
              Referenced Portfolio Evidence
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposal.referencedPortfolio.map((item) => (
                <div key={item.id} className="p-3 rounded-lg bg-[#090B10] border border-[#1F2937] space-y-2">
                  {(item.thumbnailUrl || item.mediaUrl) && (
                    <div className="relative w-full h-32 rounded border border-[#1F2937] overflow-hidden bg-black/40">
                      {isVideoMedia(item.mediaUrl, item.mediaType) ? (
                        item.thumbnailUrl ? (
                          <div className="relative w-full h-full">
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-8 h-8 rounded-full bg-[#58D5FF] text-black flex items-center justify-center shadow">
                                <Play className="w-4 h-4 fill-black ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <video
                            src={item.mediaUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        )
                      ) : (
                        <img
                          src={item.thumbnailUrl || item.mediaUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                      )}
                    </div>
                  )}
                  <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                  <p className="text-xs text-gray-400">{item.category}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
