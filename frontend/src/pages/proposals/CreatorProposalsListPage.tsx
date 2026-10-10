import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CampaignProposal } from '../../types';
import { getMyProposals, withdrawProposal, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  FileText,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Sparkles,
  Filter
} from 'lucide-react';

export const CreatorProposalsListPage: React.FC = () => {
  const [proposals, setProposals] = useState<CampaignProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyProposals({ status: statusFilter === 'all' ? undefined : statusFilter });
      setProposals(res.proposals || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load your proposals.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const handleWithdraw = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to withdraw this proposal?')) {
      return;
    }

    try {
      setWithdrawingId(id);
      await withdrawProposal(id);
      await fetchProposals();
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to withdraw proposal.'));
    } finally {
      setWithdrawingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Accepted & Awarded</Badge>;
      case 'shortlisted':
        return <Badge variant="cyan">Shortlisted</Badge>;
      case 'submitted':
        return <Badge variant="cyan">Submitted — Under Review</Badge>;
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

  // Metrics
  const totalCount = proposals.length;
  const underReviewCount = proposals.filter((p) => ['submitted', 'shortlisted'].includes(p.status)).length;
  const revisionsCount = proposals.filter((p) => p.status === 'revision_requested').length;
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>My Creator Proposals</span>
              <Badge variant="cyan" size="sm">Pitch Hub</Badge>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Track your submitted pitches, negotiate revisions, and monitor project award decisions.
            </p>
          </div>
          <Link to="/briefs">
            <Button variant="primary" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Explore Campaigns</span>
            </Button>
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Proposals</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-[#58D5FF] font-medium uppercase tracking-wider">Under Review</p>
            <p className="text-2xl font-extrabold text-[#58D5FF] mt-1">{underReviewCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">Needs Revision</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{revisionsCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Accepted & Won</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{acceptedCount}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1F2937] pb-4">
          <div className="flex items-center text-xs text-gray-400 mr-2">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <span>Filter by:</span>
          </div>
          {[
            { id: 'all', label: 'All Proposals' },
            { id: 'submitted', label: 'Under Review' },
            { id: 'shortlisted', label: 'Shortlisted' },
            { id: 'revision_requested', label: 'Revisions Requested' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'draft', label: 'Drafts' },
            { id: 'declined', label: 'Declined' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#58D5FF] text-black font-semibold'
                  : 'bg-[#11151D] text-gray-400 hover:text-white border border-[#1F2937]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Proposals List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#58D5FF]/30 border-t-[#58D5FF] rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-3">Loading proposals...</p>
          </div>
        ) : proposals.length === 0 ? (
          <Card className="p-12 text-center bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <FileText className="w-12 h-12 text-gray-500 mx-auto opacity-40" />
            <h3 className="text-lg font-bold text-white">No proposals found</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              {statusFilter === 'all'
                ? "You haven't submitted any proposals yet. Discover published brand briefs and pitch your creative services."
                : `No proposals found matching the filter "${statusFilter}".`}
            </p>
            <div className="pt-2">
              <Link to="/briefs">
                <Button variant="primary">Browse Campaigns & Submit Pitch</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {proposals.map((prop) => {
              const brief = (prop.brief || prop.briefId) as any;
              const isRevision = prop.status === 'revision_requested';
              const isDraft = prop.status === 'draft';
              const canWithdraw = ['submitted', 'shortlisted', 'revision_requested', 'draft'].includes(prop.status);

              return (
                <Card
                  key={prop.id}
                  className={`p-6 bg-[#11151D] border transition-all rounded-xl ${
                    isRevision
                      ? 'border-amber-500/50 hover:border-amber-400'
                      : prop.status === 'accepted'
                      ? 'border-emerald-500/50 hover:border-emerald-400'
                      : 'border-[#1F2937] hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Main Proposal Info */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {getStatusBadge(prop.status)}
                        <span className="text-xs text-gray-500 font-mono">{prop.proposalReference}</span>
                        {prop.revisionNumber > 1 && (
                          <Badge variant="outline" size="sm">Rev #{prop.revisionNumber}</Badge>
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white hover:text-[#58D5FF] transition-colors">
                          <Link to={`/creator/proposals/${prop.id}`}>
                            {prop.pitchTitle || brief?.title || 'Creative Proposal'}
                          </Link>
                        </h2>
                        {brief && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Target Campaign: <span className="text-gray-300 font-medium">{brief.title}</span> ({brief.companyName || 'Brand'})
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-2 max-w-3xl">
                        {prop.pitchMessage}
                      </p>

                      {/* Revision notice if requested */}
                      {isRevision && prop.revisionMessage && (
                        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200 mt-2">
                          <strong className="text-amber-400">Brand Feedback:</strong> "{prop.revisionMessage}"
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2">
                        <span className="flex items-center gap-1 font-semibold text-white">
                          ₹{prop.proposedPrice?.toLocaleString()} {prop.currency === 'USD' ? 'INR' : prop.currency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {prop.deliveryDurationWeeks} weeks duration
                        </span>
                        <span>
                          {prop.deliverables?.length || 0} deliverables
                        </span>
                        <span>
                          Updated: {new Date(prop.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0">
                      <Link to={`/creator/proposals/${prop.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs py-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Button>
                      </Link>

                      {(isDraft || isRevision) && (
                        <Link to={`/creator/proposals/${prop.id}/edit`}>
                          <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs py-1.5">
                            <Edit className="w-3.5 h-3.5" />
                            <span>{isRevision ? 'Revise & Resubmit' : 'Edit Draft'}</span>
                          </Button>
                        </Link>
                      )}

                      {prop.status === 'accepted' && (
                        <Link to="/projects">
                          <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs py-1.5 bg-emerald-600 hover:bg-emerald-500">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Go to Project</span>
                          </Button>
                        </Link>
                      )}

                      {canWithdraw && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={withdrawingId === prop.id}
                          onClick={(e) => handleWithdraw(prop.id, e)}
                          className="text-gray-500 hover:text-red-400 text-xs py-1"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
