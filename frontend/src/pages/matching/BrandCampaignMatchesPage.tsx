import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Layers,
  Wand2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Eye,
  FolderOpen
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getCampaignMatches, getMyBrandBriefs, extractErrorMessage } from '../../services/api';
import { CampaignMatchesResult, CampaignBrief } from '../../types';

export const BrandCampaignMatchesPage: React.FC = () => {
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();

  const [matchesData, setMatchesData] = useState<CampaignMatchesResult | null>(null);
  const [otherBriefs, setOtherBriefs] = useState<CampaignBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Score Filter (All, >=70 Strong, >=85 Exceptional)
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  // Expanded breakdown cards
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // Quick media preview modal
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function loadMatches() {
      if (!briefId) return;
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [matchesRes, briefsRes] = await Promise.all([
          getCampaignMatches(briefId, { limit: 30, minScore: minScoreFilter }),
          getMyBrandBriefs({ limit: 10 })
        ]);

        setMatchesData(matchesRes);
        setOtherBriefs(briefsRes.briefs.filter((b) => b.id !== briefId));

        // Auto-expand top match if available
        if (matchesRes.matches.length > 0 && !expandedMatchId) {
          setExpandedMatchId(matchesRes.matches[0].creator.id);
        }
      } catch (err) {
        setErrorMessage(extractErrorMessage(err, 'Failed to evaluate creator matches for this brief.'));
      } finally {
        setIsLoading(false);
      }
    }

    loadMatches();
  }, [briefId, minScoreFilter]);

  const toggleExpand = (creatorId: string) => {
    setExpandedMatchId((prev) => (prev === creatorId ? null : creatorId));
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 70) return 'text-accent-cyan border-accent-cyan/40 bg-accent-cyan/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-text-muted border-border-default bg-surface-subtle';
  };

  const getBadgeVariant = (grade: string) => {
    if (grade.includes('Exceptional')) return 'cyan';
    if (grade.includes('Strong')) return 'cyan';
    if (grade.includes('Moderate')) return 'default';
    return 'default';
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary pb-20">
      {/* Top Header */}
      <div className="border-b border-border-default bg-surface-card/60 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <Link
                  to="/brand/briefs"
                  className="p-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border-default text-text-secondary hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold font-heading text-white flex items-center space-x-2">
                  <Sparkles className="w-6 h-6 text-accent-cyan" />
                  <span>Explainable Creator Matching</span>
                </h1>
                {matchesData && (
                  <Badge variant="cyan" size="sm">
                    {matchesData.totalMatches} Candidates Evaluated
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted pl-9">
                Evidence-grounded creator rankings calibrated against verified portfolio proof, tool mastery, and budget parameters.
              </p>
            </div>

            {/* Quick Switch Briefs Dropdown */}
            {otherBriefs.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-text-muted shrink-0">Switch Brief:</span>
                <select
                  value={briefId}
                  onChange={(e) => navigate(`/brand/briefs/${e.target.value}/matches`)}
                  className="px-3 py-1.5 bg-surface-card border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan max-w-xs truncate"
                >
                  <option value={briefId}>{matchesData?.brief.title || 'Current Brief'}</option>
                  {otherBriefs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Campaign Summary Strip */}
          {matchesData && (
            <div className="mt-5 p-4 rounded-xl bg-surface-card border border-border-default/80 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-accent-cyan font-semibold uppercase tracking-wider block">
                  Active Campaign Brief
                </span>
                <h2 className="text-sm font-bold text-white">{matchesData.brief.title}</h2>
                <div className="flex items-center space-x-2 text-xs text-text-muted flex-wrap gap-y-1">
                  <span>Category: <strong className="text-text-secondary">{matchesData.brief.category}</strong></span>
                  <span>•</span>
                  <span>
                    Budget:{' '}
                    <strong className="text-text-secondary">
                      {matchesData.brief.currency} {matchesData.brief.budgetMin.toLocaleString()} - {matchesData.brief.budgetMax.toLocaleString()}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>Timeline: <strong className="text-text-secondary">{matchesData.brief.durationWeeks} weeks</strong></span>
                </div>
              </div>

              {/* Score Filter Pills */}
              <div className="flex items-center space-x-1.5 bg-surface-subtle p-1 rounded-lg border border-border-default text-xs">
                <button
                  onClick={() => setMinScoreFilter(0)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    minScoreFilter === 0
                      ? 'bg-accent-cyan/20 text-accent-cyan font-medium'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  All Matches
                </button>
                <button
                  onClick={() => setMinScoreFilter(70)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    minScoreFilter === 70
                      ? 'bg-accent-cyan/20 text-accent-cyan font-medium'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Strong Only (70+)
                </button>
                <button
                  onClick={() => setMinScoreFilter(85)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    minScoreFilter === 85
                      ? 'bg-accent-cyan/20 text-accent-cyan font-medium'
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  Exceptional (85+)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Error State */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between mb-6">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-6 border-border-default/40 bg-surface-card/60 animate-pulse space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-surface-subtle" />
                    <div className="space-y-2">
                      <div className="h-4 bg-surface-subtle rounded w-48" />
                      <div className="h-3 bg-surface-subtle rounded w-32" />
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-surface-subtle" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && matchesData && matchesData.matches.length === 0 && (
          <Card className="p-12 text-center border-border-default/40 bg-surface-card/60 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-subtle border border-border-default flex items-center justify-center mx-auto text-accent-cyan">
              <Sparkles className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-lg font-semibold text-white">No creator candidates meet the current threshold</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Try setting your filter to 'All Matches' or discover creators via the Creator Discovery directory.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => setMinScoreFilter(0)}>
                Show All Matches
              </Button>
              <Link to="/brand/creators">
                <Button variant="primary" size="sm">
                  Search All Creators
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Matches Ranked List */}
        {!isLoading && matchesData && matchesData.matches.length > 0 && (
          <div className="space-y-6">
            {matchesData.matches.map((match, idx) => {
              const creator = match.creator;
              const isExpanded = expandedMatchId === creator.id;
              const breakdown = match.breakdown;

              return (
                <Card
                  key={creator.id}
                  className={`border transition-all ${
                    isExpanded
                      ? 'border-accent-cyan/60 bg-surface-card shadow-neon-glow'
                      : 'border-border-default/60 bg-surface-card/80 hover:border-accent-cyan/30'
                  }`}
                >
                  {/* Top Match Summary Header */}
                  <div
                    className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
                    onClick={() => toggleExpand(creator.id)}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Rank Number Badge */}
                      <span className="text-xs font-mono font-bold text-text-muted pt-1">#{idx + 1}</span>

                      {/* Creator Avatar */}
                      <div className="w-14 h-14 rounded-full bg-surface-subtle border-2 border-accent-cyan/40 flex items-center justify-center text-accent-cyan font-bold text-lg shrink-0 overflow-hidden">
                        {creator.avatarUrl ? (
                          <img src={creator.avatarUrl} alt={creator.displayName} className="w-full h-full object-cover" />
                        ) : (
                          creator.displayName.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      {/* Creator Meta */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="text-base font-bold text-white hover:text-accent-cyan transition-colors">
                            {creator.displayName}
                          </h3>
                          <Badge variant={getBadgeVariant(match.matchGrade)} size="sm">
                            {match.matchGrade}
                          </Badge>
                          <span className="text-xs text-text-muted">@{creator.username}</span>
                        </div>

                        <p className="text-xs text-text-secondary line-clamp-1">{creator.headline}</p>

                        {/* Top Strengths snippet */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {match.strengths.slice(0, 2).map((str, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                              <span>{str}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Score Gauge & Accordion Toggle */}
                    <div className="flex items-center space-x-6 shrink-0 self-end md:self-center">
                      {/* Overall Match Score Gauge */}
                      <div className="text-center">
                        <div
                          className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-heading font-black text-xl ${getScoreColor(
                            match.overallScore
                          )}`}
                        >
                          <span>{match.overallScore}</span>
                          <span className="text-[9px] uppercase tracking-wider font-sans font-medium text-text-muted -mt-1">
                            Match
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/creators/${creator.username || creator.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm" className="text-xs">
                            Profile
                          </Button>
                        </Link>
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-surface-subtle hover:bg-surface-hover text-text-muted hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Explainability Drawer */}
                  {isExpanded && (
                    <div className="border-t border-border-default/60 p-6 bg-surface-base/50 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Skills & Specialty Overlap */}
                        <div className="p-4 rounded-xl bg-surface-card border border-border-default/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                              <Layers className="w-3.5 h-3.5 text-accent-cyan" />
                              <span>1. Specialty & Skills Alignment</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-accent-cyan">
                              {breakdown.specialties.score}/{breakdown.specialties.maxScore} pts
                            </span>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed">{breakdown.specialties.explanation}</p>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex flex-wrap gap-1">
                              {breakdown.specialties.matched.map((spec) => (
                                <span
                                  key={spec}
                                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                                >
                                  ✓ {spec}
                                </span>
                              ))}
                              {breakdown.specialties.missing.map((spec) => (
                                <span
                                  key={spec}
                                  className="text-[11px] px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border-default"
                                >
                                  ✕ {spec} (Unlisted)
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 2. Creative Tools & Software */}
                        <div className="p-4 rounded-xl bg-surface-card border border-border-default/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                              <Wand2 className="w-3.5 h-3.5 text-accent-cyan" />
                              <span>2. Tool & Software Mastery</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-accent-cyan">
                              {breakdown.tools.score}/{breakdown.tools.maxScore} pts
                            </span>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed">{breakdown.tools.explanation}</p>

                          <div className="flex flex-wrap gap-1 pt-1">
                            {breakdown.tools.matched.map((tool) => (
                              <span
                                key={tool}
                                className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium"
                              >
                                ✓ {tool}
                              </span>
                            ))}
                            {breakdown.tools.missing.map((tool) => (
                              <span
                                key={tool}
                                className="text-[11px] px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border-default"
                              >
                                ✕ {tool} (Unlisted)
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 3. Budget & Currency Compatibility */}
                        <div className="p-4 rounded-xl bg-surface-card border border-border-default/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                              <DollarSign className="w-3.5 h-3.5 text-accent-cyan" />
                              <span>3. Budget & Package Fit</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-accent-cyan">
                              {breakdown.budget.score}/{breakdown.budget.maxScore} pts
                            </span>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed">{breakdown.budget.explanation}</p>

                          <div className="flex items-center space-x-2 text-xs text-text-muted pt-1">
                            <span>Currency Check:</span>
                            {breakdown.budget.currencyMatch ? (
                              <span className="text-emerald-400 font-medium">✓ Matching ({breakdown.budget.briefCurrency})</span>
                            ) : (
                              <span className="text-amber-400 font-medium">
                                ⚠ Different ({breakdown.budget.creatorCurrency} vs {breakdown.budget.briefCurrency})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4. Availability & Bandwidth */}
                        <div className="p-4 rounded-xl bg-surface-card border border-border-default/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                              <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                              <span>4. Availability & Bandwidth</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-accent-cyan">
                              {breakdown.availability.score}/{breakdown.availability.maxScore} pts
                            </span>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed">{breakdown.availability.explanation}</p>

                          <div className="pt-1">
                            <span className="text-xs text-text-muted">
                              Status:{' '}
                              <strong className="text-white capitalize">{breakdown.availability.status}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 5. Verified Public Portfolio Proof Citations */}
                      {breakdown.portfolioEvidence.citedItems.length > 0 && (
                        <div className="p-4 rounded-xl bg-surface-card border border-border-default/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                              <FolderOpen className="w-3.5 h-3.5 text-accent-cyan" />
                              <span>Verified Public Portfolio Proof ({breakdown.portfolioEvidence.citedItems.length} Citations)</span>
                            </h4>
                            <span className="text-xs font-mono font-bold text-accent-cyan">
                              {breakdown.portfolioEvidence.score}/{breakdown.portfolioEvidence.maxScore} pts
                            </span>
                          </div>

                          <p className="text-xs text-text-secondary">{breakdown.portfolioEvidence.explanation}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            {breakdown.portfolioEvidence.citedItems.map((item) => (
                              <div
                                key={item.id}
                                className="group p-2.5 rounded-lg bg-surface-subtle border border-border-default/60 hover:border-accent-cyan/40 transition-colors space-y-2 cursor-pointer"
                                onClick={() => setPreviewMedia({ url: item.thumbnailUrl || item.mediaUrl, title: item.title })}
                              >
                                <div className="aspect-video rounded-md overflow-hidden bg-black/40 relative">
                                  <img
                                    src={item.thumbnailUrl || item.mediaUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                                <h5 className="text-xs font-bold text-white line-clamp-1">{item.title}</h5>
                                <div className="flex flex-wrap gap-1">
                                  {item.matchedTags.slice(0, 2).map((tag, tIdx) => (
                                    <span key={tIdx} className="text-[10px] px-1.5 py-0.2 rounded bg-surface-card text-accent-cyan">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths and Gaps Checklist */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {match.strengths.length > 0 && (
                          <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                            <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                              <ShieldCheck className="w-4 h-4" />
                              <span>Verified Match Strengths</span>
                            </span>
                            <ul className="space-y-1 text-xs text-text-secondary">
                              {match.strengths.map((str, sIdx) => (
                                <li key={sIdx} className="flex items-start space-x-1.5">
                                  <span className="text-emerald-400">✓</span>
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {match.gaps.length > 0 && (
                          <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                            <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                              <ShieldAlert className="w-4 h-4" />
                              <span>Unverified Criteria & Constraints</span>
                            </span>
                            <ul className="space-y-1 text-xs text-text-secondary">
                              {match.gaps.map((gap, gIdx) => (
                                <li key={gIdx} className="flex items-start space-x-1.5">
                                  <span className="text-amber-400">⚠</span>
                                  <span>{gap}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Handoff Actions */}
                      <div className="pt-3 flex items-center justify-end space-x-3">
                        <Link to={`/creators/${creator.username || creator.id}`}>
                          <Button variant="outline" size="sm">
                            Inspect Complete Profile
                          </Button>
                        </Link>
                        <Link to={`/brand/proposals?briefId=${briefId}`}>
                          <Button variant="primary" size="sm">
                            Review Campaign Proposals
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Quick Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-surface-card border border-border-default rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-border-default flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{previewMedia.title}</h4>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-surface-subtle"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[70vh]">
              <img src={previewMedia.url} alt={previewMedia.title} className="max-h-[60vh] max-w-full object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
