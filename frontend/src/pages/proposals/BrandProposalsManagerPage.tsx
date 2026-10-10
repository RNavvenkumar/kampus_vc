import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CampaignProposal, CampaignBrief } from '../../types';
import { getBrandProposals, getMyBrandBriefs, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  FileText,
  Clock,
  DollarSign,
  AlertCircle,
  Search,
  User,
  ArrowRight
} from 'lucide-react';

export const BrandProposalsManagerPage: React.FC = () => {
  const [proposals, setProposals] = useState<CampaignProposal[]>([]);
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [selectedBriefId, setSelectedBriefId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const briefsRes = await getMyBrandBriefs();
        setBriefs(briefsRes?.briefs || []);
      } catch (err) {
        console.error('Failed to load campaigns for filter:', err);
      }
    }
    loadCampaigns();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBrandProposals({
        briefId: selectedBriefId === 'all' ? undefined : selectedBriefId,
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: searchQuery.trim() || undefined
      });
      setProposals(res.proposals || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load creator proposals.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [selectedBriefId, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProposals();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Awarded & Accepted</Badge>;
      case 'shortlisted':
        return <Badge variant="cyan">Shortlisted</Badge>;
      case 'submitted':
        return <Badge variant="outline">New Proposal</Badge>;
      case 'revision_requested':
        return <Badge variant="warning">Revision Pending</Badge>;
      case 'declined':
        return <Badge variant="error">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalCount = proposals.length;
  const newCount = proposals.filter((p) => p.status === 'submitted').length;
  const shortlistedCount = proposals.filter((p) => p.status === 'shortlisted').length;
  const revisionsCount = proposals.filter((p) => p.status === 'revision_requested').length;
  const awardedCount = proposals.filter((p) => p.status === 'accepted').length;

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>Brand Proposal Review Center</span>
              <Badge variant="cyan" size="sm">Review Center</Badge>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Review submitted creator pitches, shortlist top contenders, request revisions, and award projects.
            </p>
          </div>
          <Link to="/brand/briefs">
            <Button variant="outline" className="border-[#1F2937]">
              Manage Campaigns
            </Button>
          </Link>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-gray-400 uppercase font-medium">Total Proposals</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-[#58D5FF] uppercase font-medium">New Submissions</p>
            <p className="text-2xl font-extrabold text-[#58D5FF] mt-1">{newCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-purple-400 uppercase font-medium">Shortlisted</p>
            <p className="text-2xl font-extrabold text-purple-400 mt-1">{shortlistedCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-amber-400 uppercase font-medium">Revisions</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{revisionsCount}</p>
          </Card>
          <Card className="p-4 bg-[#11151D] border-[#1F2937] rounded-xl">
            <p className="text-xs text-emerald-400 uppercase font-medium">Awarded</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{awardedCount}</p>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-[#11151D] border border-[#1F2937] rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Campaign Dropdown Filter */}
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-medium text-gray-400 mb-1">Filter by Campaign</label>
              <select
                value={selectedBriefId}
                onChange={(e) => setSelectedBriefId(e.target.value)}
                className="w-full bg-[#090B10] border border-[#1F2937] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#58D5FF]"
              >
                <option value="all">All Campaigns ({briefs.length})</option>
                {briefs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Text Search */}
            <form onSubmit={handleSearch} className="w-full sm:w-2/3 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 mb-1">Search Pitch or Creator</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search by creator name, pitch title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#090B10] border-[#1F2937] text-white pl-9 text-xs"
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" size="sm" className="h-9 px-4 text-xs">
                Search
              </Button>
            </form>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1F2937]">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'submitted', label: 'New Under Review' },
              { id: 'shortlisted', label: 'Shortlisted' },
              { id: 'revision_requested', label: 'Revision Pending' },
              { id: 'accepted', label: 'Awarded' },
              { id: 'declined', label: 'Declined' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-[#58D5FF] text-black font-semibold'
                    : 'bg-[#090B10] text-gray-400 hover:text-white border border-[#1F2937]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error alert */}
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
            <p className="text-gray-400 text-sm mt-3">Loading proposals for review...</p>
          </div>
        ) : proposals.length === 0 ? (
          <Card className="p-12 text-center bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <FileText className="w-12 h-12 text-gray-500 mx-auto opacity-40" />
            <h3 className="text-lg font-bold text-white">No proposals to review</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              {statusFilter === 'all'
                ? 'No creators have submitted proposals for this filter yet. When creators submit pitches, they will appear here.'
                : `No proposals found with status "${statusFilter}".`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {proposals.map((prop) => {
              const brief = (prop.brief || prop.briefId) as any;
              const creatorProfile = prop.creatorProfile as any;
              const creatorUser = (prop.creator || prop.creatorId) as any;
              const displayName = creatorProfile?.displayName || creatorUser?.name || 'Creator';

              return (
                <Card
                  key={prop.id}
                  className={`p-6 bg-[#11151D] border transition-all rounded-xl ${
                    prop.status === 'shortlisted'
                      ? 'border-[#58D5FF]/60 hover:border-[#58D5FF]'
                      : prop.status === 'accepted'
                      ? 'border-emerald-500/60 hover:border-emerald-400'
                      : 'border-[#1F2937] hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Creator & Pitch Details */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {getStatusBadge(prop.status)}
                        <span className="text-xs text-gray-500 font-mono">{prop.proposalReference}</span>
                        {prop.revisionNumber > 1 && (
                          <Badge variant="outline" size="sm">Revision #{prop.revisionNumber}</Badge>
                        )}
                        {brief && (
                          <Badge variant="outline" size="sm" className="text-gray-400 border-gray-700">
                            {brief.title}
                          </Badge>
                        )}
                      </div>

                      {/* Creator Identity */}
                      <div className="flex items-center gap-3">
                        {creatorProfile?.avatarUrl ? (
                          <img
                            src={creatorProfile.avatarUrl}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover border border-[#1F2937]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#1F2937] flex items-center justify-center text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-base font-bold text-white leading-tight">{displayName}</h2>
                          {creatorProfile?.headline && (
                            <p className="text-xs text-gray-400 truncate max-w-lg">{creatorProfile.headline}</p>
                          )}
                        </div>
                      </div>

                      {/* Pitch Snippet */}
                      <div>
                        {prop.pitchTitle && (
                          <h4 className="text-sm font-semibold text-[#58D5FF] mb-1">{prop.pitchTitle}</h4>
                        )}
                        <p className="text-xs text-gray-300 line-clamp-2 max-w-3xl leading-relaxed">
                          {prop.pitchMessage}
                        </p>
                      </div>

                      {/* Specialties badges */}
                      {creatorProfile?.specialties && creatorProfile.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {creatorProfile.specialties.slice(0, 4).map((spec: string, i: number) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#090B10] text-gray-300 border border-[#1F2937]"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Commercial Snapshot */}
                      <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400 pt-1">
                        <span className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          ${prop.proposedPrice?.toLocaleString()} {prop.currency}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {prop.deliveryDurationWeeks} weeks turnaround
                        </span>
                        <span>
                          {prop.deliverables?.length || 0} deliverables
                        </span>
                        <span>
                          Submitted: {new Date(prop.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center">
                      <Link to={`/brand/proposals/${prop.id}`}>
                        <Button variant="primary" className="flex items-center gap-2 text-xs py-2 px-4 shadow-md">
                          <span>Review & Decide</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
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
