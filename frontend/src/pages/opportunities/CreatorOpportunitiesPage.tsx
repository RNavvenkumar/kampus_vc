import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Filter,
  CheckCircle2,
  Briefcase,
  RefreshCw,
  Send
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getCreatorOpportunities, extractErrorMessage } from '../../services/api';
import { CreatorOpportunitiesResult } from '../../types';

const CATEGORIES = [
  'All',
  '3D Animation & Motion',
  'AI Art & Concept Direction',
  'Video Production & Direction',
  'Motion Graphics & VFX',
  'Brand Identity & Design',
  'Audio & Sound Design'
];

export const CreatorOpportunitiesPage: React.FC = () => {

  const [opportunitiesData, setOpportunitiesData] = useState<CreatorOpportunitiesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minBudget, setMinBudget] = useState('');
  const [sortBy, setSortBy] = useState('match_score');

  const loadOpportunities = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await getCreatorOpportunities({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        minBudget: minBudget ? Number(minBudget) : undefined,
        sort: sortBy === 'newest' ? 'newest' : sortBy === 'budget_high' ? 'budget_high' : 'match_score',
        limit: 25
      });

      setOpportunitiesData(result);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to load personalized campaign opportunities.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [selectedCategory, minBudget, sortBy]);

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 70) return 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-text-muted border-border-default bg-surface-subtle';
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary pb-20">
      {/* Header */}
      <div className="border-b border-border-default bg-surface-card/60 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-accent-cyan" />
                <h1 className="text-2xl font-bold font-heading text-white">Campaign Opportunities</h1>
                {opportunitiesData && (
                  <Badge variant="cyan" size="sm">
                    {opportunitiesData.total} Opportunities
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">
                Campaign briefs ranked and calibrated by compatibility with your creative DNA, tools, and pricing parameters.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/creator/proposals">
                <Button variant="outline" size="sm" leftIcon={<Briefcase className="w-4 h-4" />}>
                  My Pitches & Proposals
                </Button>
              </Link>
            </div>
          </div>

          {/* Creator DNA Skills Pill Header */}
          {opportunitiesData?.creatorSummary && (
            <div className="mt-4 p-3 rounded-xl bg-surface-card border border-border-default flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                <span className="text-text-muted">Ranked for:</span>
                <strong className="text-white">{opportunitiesData.creatorSummary.displayName}</strong>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted">Skills:</span>
                {opportunitiesData.creatorSummary.specialties.slice(0, 3).map((spec) => (
                  <Badge key={spec} variant="default" size="sm" className="text-[10px] py-0.2">
                    {spec}
                  </Badge>
                ))}
                {opportunitiesData.creatorSummary.creativeTools.slice(0, 3).map((tool) => (
                  <Badge key={tool} variant="cyan" size="sm" className="text-[10px] py-0.2">
                    {tool}
                  </Badge>
                ))}
              </div>

              <Link to="/creator/studio" className="text-xs text-accent-cyan hover:underline">
                Edit Profile Skills →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-border-default/40">
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div className="flex items-center space-x-1 text-xs text-text-muted">
              <Filter className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-surface-card border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-text-muted">
              <span>Min Budget:</span>
              <input
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                placeholder="e.g. 2000"
                className="w-24 px-2 py-1 bg-surface-card border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-text-muted">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-surface-card border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
            >
              <option value="match_score">Highest Match Score</option>
              <option value="newest">Recently Published</option>
              <option value="budget_high">Highest Budget</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between mb-6">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={loadOpportunities}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-6 border-border-default/40 bg-surface-card/60 animate-pulse space-y-4">
                <div className="h-5 bg-surface-subtle rounded w-1/3" />
                <div className="h-4 bg-surface-subtle rounded w-3/4" />
                <div className="h-10 bg-surface-subtle rounded" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && opportunitiesData && opportunitiesData.opportunities.length === 0 && (
          <Card className="p-12 text-center border-border-default/40 bg-surface-card/60 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-subtle border border-border-default flex items-center justify-center mx-auto text-accent-cyan">
              <Briefcase className="w-8 h-8 opacity-60" />
            </div>
            <h3 className="text-lg font-semibold text-white">No published campaigns match this filter</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Try switching your category filter to 'All' or explore the public campaigns directory.
            </p>
            <Button variant="primary" size="sm" onClick={() => setSelectedCategory('All')}>
              Show All Campaigns
            </Button>
          </Card>
        )}

        {/* Opportunities List */}
        {!isLoading && opportunitiesData && opportunitiesData.opportunities.length > 0 && (
          <div className="space-y-6">
            {opportunitiesData.opportunities.map((opp) => {
              const hasPitched = opp.proposalStatus && opp.proposalStatus !== 'none';

              return (
                <Card
                  key={opp.id}
                  className="p-6 border-border-default/60 bg-surface-card hover:border-accent-cyan/40 transition-all hover:shadow-neon space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Company & Category Badge */}
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-semibold text-accent-cyan">{opp.companyName}</span>
                        <span className="text-text-muted">•</span>
                        <Badge variant="default" size="sm">
                          {opp.category}
                        </Badge>
                        <span className="text-[11px] text-text-muted">
                          Posted {new Date(opp.publishedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Campaign Title */}
                      <h3 className="text-lg font-bold text-white hover:text-accent-cyan transition-colors">
                        <Link to={`/briefs/${opp.slug || opp.id}`}>{opp.title}</Link>
                      </h3>

                      {/* Summary */}
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {opp.summary || opp.description}
                      </p>

                      {/* Required Specialties & Tools */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {opp.requiredSpecialties?.map((spec) => (
                          <span
                            key={spec}
                            className="text-[11px] px-2 py-0.5 rounded bg-surface-subtle border border-border-default text-text-secondary"
                          >
                            {spec}
                          </span>
                        ))}
                        {opp.creativeTools?.map((tool) => (
                          <span
                            key={tool}
                            className="text-[11px] px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan font-medium"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>

                      {/* Explainable Fit Reasons */}
                      {opp.reasons && opp.reasons.length > 0 && (
                        <div className="pt-2">
                          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border-default/60 flex items-start space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-text-secondary">
                              <span className="font-semibold text-white mr-1">Why this matches your profile:</span>
                              {opp.reasons.join(' • ')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side: Score Gauge & Pitch CTA */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border-default/40">
                      {/* Match Score Badge */}
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${getScoreBadgeColor(
                            opp.matchScore
                          )}`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{opp.matchScore}% Match</span>
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="text-right">
                        <span className="text-[10px] text-text-muted uppercase tracking-wider block">Target Budget</span>
                        <span className="text-sm font-bold text-white font-mono">
                          {opp.currency} {opp.budgetMin.toLocaleString()} - {opp.budgetMax.toLocaleString()}
                        </span>
                      </div>

                      {/* Timeline */}
                      <div className="text-right text-xs text-text-muted hidden md:block">
                        <span>Duration: {opp.durationWeeks} weeks</span>
                      </div>

                      {/* Action CTA */}
                      <div className="pt-2">
                        {hasPitched ? (
                          <Link to={`/creator/proposals/${opp.proposalId}`}>
                            <Button variant="outline" size="sm" className="text-xs text-emerald-400 border-emerald-500/40">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Pitched ({opp.proposalStatus})
                            </Button>
                          </Link>
                        ) : (
                          <Link to={`/creator/proposals/new/${opp.id}`}>
                            <Button variant="primary" size="sm" className="text-xs" leftIcon={<Send className="w-3.5 h-3.5" />}>
                              Submit Pitch
                            </Button>
                          </Link>
                        )}
                      </div>
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
