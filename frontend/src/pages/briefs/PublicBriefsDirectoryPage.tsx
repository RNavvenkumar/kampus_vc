import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CampaignBrief } from '../../types';
import { getPublicBriefs, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionHeader } from '../../components/ui/SectionHeader';
import {
  Search,
  Sparkles,
  ArrowRight,
  X,
  AlertCircle,
  Building
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Commercial AI Video & Film',
  '3D Motion & Product Visuals',
  'Visual Identity & AI Branding',
  'Generative Concept Art',
  'AI Fashion & Editorial',
  'Game Asset Production'
];

export const PublicBriefsDirectoryPage: React.FC = () => {
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [engagementType, setEngagementType] = useState('All');
  const [sortOption, setSortOption] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPublicBriefs({
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        engagementType: engagementType !== 'All' ? engagementType : undefined,
        sort: sortOption,
        page,
        limit: 12
      });
      setBriefs(res.briefs || []);
      if (res.pagination) {
        setTotalPages(res.pagination.pages || 1);
        setTotalCount(res.pagination.total || 0);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to fetch public briefs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, [selectedCategory, engagementType, sortOption, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBriefs();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 animate-fadeIn">
      {/* Header */}
      <SectionHeader
        pillText="Live Marketplace Briefs"
        title="Discover Active Brand Campaigns"
        subtitle="Explore verified creative briefs, commercial video commissions, 3D motion briefs, and brand identity projects."
        align="center"
      />

      {/* Search & Filter Bar */}
      <Card variant="glass" className="p-6 max-w-5xl mx-auto border-border">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search campaigns by title, keywords, or creative requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button type="submit" variant="primary" size="md">
              Search Briefs
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-xs">
            {/* Category selection */}
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-mono uppercase font-semibold">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-surface-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Engagement Filter */}
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-mono uppercase font-semibold">Model:</span>
              <select
                value={engagementType}
                onChange={(e) => {
                  setEngagementType(e.target.value);
                  setPage(1);
                }}
                className="bg-surface-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="All">All Types</option>
                <option value="milestone">Milestone Project</option>
                <option value="one_off">One-Off</option>
                <option value="retainer">Retainer</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-mono uppercase font-semibold">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setPage(1);
                }}
                className="bg-surface-elevated border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="newest">Newest First</option>
                <option value="budget_high">Highest Budget</option>
                <option value="budget_low">Lowest Budget</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </form>
      </Card>

      {/* Briefs Count */}
      <div className="flex items-center justify-between text-xs text-text-muted font-mono max-w-5xl mx-auto px-2">
        <span>Showing {briefs.length} of {totalCount} published briefs</span>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/40 text-status-error text-sm flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchBriefs}>
            Retry
          </Button>
        </div>
      )}

      {/* Briefs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} variant="elevated" className="p-6 space-y-4 animate-pulse border-border">
              <div className="h-5 bg-surface-muted rounded w-1/3" />
              <div className="h-6 bg-surface-muted rounded w-3/4" />
              <div className="h-16 bg-surface-muted rounded" />
            </Card>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center border-border space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-accent">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary font-display">No published briefs found</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            There are currently no active briefs matching your search filters. Check back soon as new brands post campaigns regularly.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setEngagementType('All');
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {briefs.map((brief) => (
            <Card
              key={brief.id}
              variant="elevated"
              className="p-6 border-border flex flex-col justify-between hover:border-accent/50 transition-all duration-300 space-y-5 group"
            >
              <div className="space-y-3.5">
                {/* Brand & Category Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-accent flex items-center gap-1 truncate">
                    <Building className="w-3.5 h-3.5" />
                    {brief.companyName}
                  </span>
                  <Badge variant="cyan" size="sm">
                    {brief.category}
                  </Badge>
                </div>

                {/* Title & Summary */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary font-display line-clamp-2 group-hover:text-accent transition-colors">
                    {brief.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
                    {brief.summary || brief.description}
                  </p>
                </div>

                {/* Specialties tags */}
                {brief.requiredSpecialties && brief.requiredSpecialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {brief.requiredSpecialties.slice(0, 3).map((spec, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded text-[10px] bg-surface-muted text-text-muted border border-border/40"
                      >
                        {spec}
                      </span>
                    ))}
                    {brief.requiredSpecialties.length > 3 && (
                      <span className="text-[10px] text-text-muted font-mono self-center">
                        +{brief.requiredSpecialties.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-text-muted uppercase block">Budget</span>
                    <span className="text-base font-bold text-text-primary font-display">
                      ₹{brief.budgetMin.toLocaleString()} – ₹{brief.budgetMax.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-text-muted uppercase block">Terms</span>
                    <span className="text-xs text-text-secondary capitalize">
                      {brief.engagementType} • {brief.locationPreference}
                    </span>
                  </div>
                </div>

                <Link to={`/briefs/${brief.slug || brief.id}`} className="block">
                  <Button variant="primary" size="sm" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View Campaign Brief
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs font-mono text-text-muted px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
