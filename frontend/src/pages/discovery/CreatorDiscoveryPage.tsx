import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  CheckCircle2,
  Wand2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { searchCreators, parseSearchIntent, extractErrorMessage } from '../../services/api';
import { SafePublicCreator, CreatorSearchQuery, ParsedSearchIntent } from '../../types';

const CATEGORIES = [
  'All',
  '3D Animation & Motion',
  'AI Art & Concept Direction',
  'Video Production & Direction',
  'Motion Graphics & VFX',
  'Brand Identity & Design',
  'Audio & Sound Design'
];

const POPULAR_TOOLS = [
  'Blender',
  'Unreal Engine',
  'Cinema 4D',
  'Midjourney',
  'Stable Diffusion',
  'Runway Gen-2',
  'After Effects',
  'Premiere Pro',
  'Figma',
  'Houdini',
  'Maya',
  'ComfyUI'
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

export const CreatorDiscoveryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedTools, setSelectedTools] = useState<string[]>(
    searchParams.get('creativeTools') ? searchParams.get('creativeTools')!.split(',') : []
  );
  const [minPrice, setMinPrice] = useState<string>(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(searchParams.get('maxPrice') || '');
  const [currency, setCurrency] = useState<string>(searchParams.get('currency') || 'INR');
  const [availability, setAvailability] = useState<string>(searchParams.get('availability') || 'All');
  const [experienceLevel, setExperienceLevel] = useState<string>(searchParams.get('experienceLevel') || 'All');
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'relevance');
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));

  // AI Natural Language Search Intent State
  const [aiSearchInput, setAiSearchInput] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiIntentFeedback, setAiIntentFeedback] = useState<string | null>(null);

  // Results State
  const [creators, setCreators] = useState<SafePublicCreator[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Selected portfolio item for quick modal preview
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string; type: string } | null>(null);

  // Synchronize URL with active state
  const syncUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedTools.length > 0) params.set('creativeTools', selectedTools.join(','));
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (currency !== 'INR') params.set('currency', currency);
    if (availability !== 'All') params.set('availability', availability);
    if (experienceLevel !== 'All') params.set('experienceLevel', experienceLevel);
    if (sortBy !== 'relevance') params.set('sortBy', sortBy);
    if (page > 1) params.set('page', page.toString());
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, selectedTools, minPrice, maxPrice, currency, availability, experienceLevel, sortBy, page, setSearchParams]);

  // Fetch Creators from Backend
  const loadCreators = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const queryParams: CreatorSearchQuery = {
        q: searchQuery.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        creativeTools: selectedTools.length > 0 ? selectedTools : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        currency: currency || 'INR',
        availability: availability !== 'All' ? (availability as any) : undefined,
        experienceLevel: experienceLevel !== 'All' ? (experienceLevel as any) : undefined,
        sortBy: sortBy as any,
        page,
        limit: 12
      };

      const result = await searchCreators(queryParams);
      setCreators(result.creators);
      setTotalCount(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to discover creators. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedTools, minPrice, maxPrice, currency, availability, experienceLevel, sortBy, page]);

  useEffect(() => {
    loadCreators();
    syncUrlParams();
  }, [loadCreators, syncUrlParams]);

  // AI Intent Query Handler
  const handleAiIntentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchInput.trim()) return;

    try {
      setIsAiSearching(true);
      setAiIntentFeedback(null);

      const intent: ParsedSearchIntent = await parseSearchIntent(aiSearchInput.trim());

      if (intent.category) setSelectedCategory(intent.category);
      if (intent.creativeTools && intent.creativeTools.length > 0) setSelectedTools(intent.creativeTools);
      if (intent.maxPrice) setMaxPrice(intent.maxPrice.toString());
      if (intent.currency) setCurrency(intent.currency);
      if (intent.experienceLevel) setExperienceLevel(intent.experienceLevel);
      if (intent.interpretedQuery) setSearchQuery(intent.interpretedQuery);
      setPage(1);

      setAiIntentFeedback(
        `✨ Extracted: ${intent.category || 'Any category'} • Tools: ${intent.creativeTools.join(', ') || 'Any'} ${
          intent.maxPrice ? `• Max Price: ${intent.currency} ${intent.maxPrice}` : ''
        }`
      );
    } catch (err) {
      // If AI intent parsing fails, fallback to simple text search
      setSearchQuery(aiSearchInput.trim());
      setPage(1);
    } finally {
      setIsAiSearching(false);
    }
  };

  // Toggle tool filter
  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
    setPage(1);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedTools([]);
    setMinPrice('');
    setMaxPrice('');
    setCurrency('INR');
    setAvailability('All');
    setExperienceLevel('All');
    setSortBy('relevance');
    setAiSearchInput('');
    setAiIntentFeedback(null);
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All' ||
    selectedTools.length > 0 ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    availability !== 'All' ||
    experienceLevel !== 'All' ||
    sortBy !== 'relevance';

  return (
    <div className="min-h-screen bg-surface-base text-text-primary pb-20">
      {/* Header Section */}
      <div className="border-b border-border-default bg-surface-card/40 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold font-heading text-white">Creator Discovery</h1>
                <Badge variant="cyan" size="sm">
                  {totalCount} Verified Creators
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Discover world-class 3D artists, AI directors, VFX animators, and digital creators with verified portfolios.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                leftIcon={<SlidersHorizontal className="w-4 h-4" />}
              >
                Filters {hasActiveFilters && '•'}
              </Button>

              <Link to="/brand/briefs">
                <Button variant="secondary" size="sm" leftIcon={<Sparkles className="w-4 h-4 text-accent-cyan" />}>
                  Match With My Campaigns
                </Button>
              </Link>
            </div>
          </div>

          {/* AI Search Bar */}
          <div className="mt-5">
            <form onSubmit={handleAiIntentSearch} className="relative flex items-center">
              <div className="absolute left-3.5 text-accent-cyan flex items-center pointer-events-none">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <input
                type="text"
                value={aiSearchInput}
                onChange={(e) => setAiSearchInput(e.target.value)}
                placeholder="Ask with Natural Language e.g. 'Senior 3D Unreal Engine animator with automotive commercial portfolio under ₹50,000'"
                className="w-full pl-10 pr-32 py-2.5 bg-surface-card border border-border-default/80 rounded-xl text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent-cyan/60 focus:ring-1 focus:ring-accent-cyan/30 transition-all shadow-inner"
              />
              <div className="absolute right-2 flex items-center space-x-2">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={isAiSearching}
                  disabled={!aiSearchInput.trim()}
                  className="px-3 py-1 text-xs"
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1" />
                  AI Filter
                </Button>
              </div>
            </form>

            {aiIntentFeedback && (
              <div className="mt-2 text-xs text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/20 px-3 py-1.5 rounded-lg flex items-center justify-between">
                <span>{aiIntentFeedback}</span>
                <button
                  type="button"
                  onClick={() => setAiIntentFeedback(null)}
                  className="text-text-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Sidebar + Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Filter Sidebar (Desktop) */}
          <div className={`lg:col-span-3 space-y-6 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>
            <Card className="p-5 border-border-default/60 bg-surface-card/90 sticky top-48">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-default/40">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-accent-cyan" />
                  <span className="text-sm font-semibold text-white">Refine Search</span>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-accent-cyan hover:underline transition-colors"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="space-y-5 text-xs">
                {/* Keyword Text Input */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Direct Keyword / Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="e.g. Cyberpunk, Unreal..."
                      className="w-full pl-8 pr-3 py-2 bg-surface-subtle border border-border-default rounded-lg text-xs text-white placeholder-text-muted focus:outline-none focus:border-accent-cyan"
                    />
                    <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-text-muted hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Primary Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-surface-subtle border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tools Multi-Select */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2">Creative & AI Software</label>
                  <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {POPULAR_TOOLS.map((tool) => {
                      const isSelected = selectedTools.includes(tool);
                      return (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => toggleTool(tool)}
                          className={`text-[11px] px-2.5 py-1 rounded-md transition-colors border ${
                            isSelected
                              ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan font-medium'
                              : 'bg-surface-subtle border-border-default text-text-secondary hover:text-white hover:border-border-default/80'
                          }`}
                        >
                          {tool}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price / Budget Range */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-text-muted">Price Range</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="text-[10px] bg-surface-subtle border border-border-default rounded px-1.5 py-0.5 text-text-secondary"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Min $"
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
                    />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Max $"
                      className="w-full px-2.5 py-1.5 bg-surface-subtle border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Bandwidth / Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => {
                      setAvailability(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-surface-subtle border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
                  >
                    <option value="All">All Bandwidths</option>
                    <option value="available">🟢 Available Immediately</option>
                    <option value="limited">🟡 Limited Capacity</option>
                    <option value="busy">⚪ Busy / Full</option>
                  </select>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => {
                      setExperienceLevel(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-surface-subtle border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
                  >
                    <option value="All">All Experience Levels</option>
                    <option value="expert">Expert / Director Level</option>
                    <option value="advanced">Advanced / Senior</option>
                    <option value="intermediate">Intermediate / Mid-weight</option>
                    <option value="beginner">Emerging Talent</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Active Chips + Results Grid */}
          <div className="lg:col-span-9 space-y-6">
            {/* Sort & Active Chips Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default/40">
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <span className="text-xs text-text-muted">Active Filters:</span>
                {selectedCategory !== 'All' && (
                  <Badge variant="cyan" size="sm">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('All')} className="ml-1.5 hover:text-white">
                      <X className="w-3 h-3 inline" />
                    </button>
                  </Badge>
                )}
                {selectedTools.map((tool) => (
                  <Badge key={tool} variant="cyan" size="sm">
                    {tool}
                    <button onClick={() => toggleTool(tool)} className="ml-1.5 hover:text-white">
                      <X className="w-3 h-3 inline" />
                    </button>
                  </Badge>
                ))}
                {searchQuery && (
                  <Badge variant="default" size="sm">
                    Keyword: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-1.5 hover:text-white">
                      <X className="w-3 h-3 inline" />
                    </button>
                  </Badge>
                )}
                {(minPrice || maxPrice) && (
                  <Badge variant="default" size="sm">
                    Price: {minPrice ? `${currency} ${minPrice}` : '0'} - {maxPrice ? `${currency} ${maxPrice}` : '∞'}
                    <button
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                      }}
                      className="ml-1.5 hover:text-white"
                    >
                      <X className="w-3 h-3 inline" />
                    </button>
                  </Badge>
                )}
                {!hasActiveFilters && <span className="text-xs text-text-secondary">None (Showing all verified creators)</span>}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-text-muted">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-surface-card border border-border-default rounded-lg text-xs text-white focus:outline-none focus:border-accent-cyan"
                >
                  <option value="relevance">Relevance & Match</option>
                  <option value="newest">Recently Active</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="completion">Profile Completeness</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
                <span>{errorMessage}</span>
                <Button variant="outline" size="sm" onClick={loadCreators}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="p-6 border-border-default/40 bg-surface-card/60 animate-pulse space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-surface-subtle" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-surface-subtle rounded w-3/4" />
                        <div className="h-3 bg-surface-subtle rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-16 bg-surface-subtle rounded-lg" />
                    <div className="h-6 bg-surface-subtle rounded w-full" />
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && creators.length === 0 && (
              <Card className="p-12 text-center border-border-default/40 bg-surface-card/60 space-y-4">
                <div className="w-16 h-16 rounded-full bg-surface-subtle border border-border-default flex items-center justify-center mx-auto text-accent-cyan">
                  <Search className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-lg font-semibold text-white">No creators match your exact filters</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  Try broadening your search criteria, clearing specific tool requirements, or resetting your price filters.
                </p>
                <Button variant="primary" size="sm" onClick={resetFilters}>
                  Clear All Filters
                </Button>
              </Card>
            )}

            {/* Creator Cards Grid */}
            {!isLoading && creators.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creators.map((creator) => {
                  const hasPortfolio = creator.portfolioItems && creator.portfolioItems.length > 0;
                  const primaryService = creator.services && creator.services[0];

                  return (
                    <Card
                      key={creator.id}
                      className="p-5 border-border-default/60 bg-surface-card/90 hover:border-accent-cyan/40 transition-all hover:shadow-neon flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        {/* Header: Avatar, Name, Handle, Availability */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-12 h-12 rounded-full bg-surface-subtle border border-accent-cyan/30 flex items-center justify-center text-accent-cyan font-bold text-base shrink-0 overflow-hidden">
                              {creator.avatarUrl ? (
                                <img
                                  src={creator.avatarUrl}
                                  alt={creator.displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                creator.displayName.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <h3 className="text-sm font-bold text-white hover:text-accent-cyan transition-colors">
                                  <Link to={`/creators/${creator.username || creator.id}`}>
                                    {creator.displayName}
                                  </Link>
                                </h3>
                                <CheckCircle2 className="w-3.5 h-3.5 text-accent-cyan" />
                              </div>
                              <p className="text-xs text-text-muted">@{creator.username}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="default" size="sm" className="text-[10px] px-1.5 py-0.2">
                                  {creator.experienceLevel || 'Senior'}
                                </Badge>
                                {creator.location && (
                                  <span className="text-[11px] text-text-secondary">📍 {creator.location}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Availability Badge */}
                          <div className="shrink-0">
                            {creator.availability === 'available' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                                Available
                              </span>
                            ) : creator.availability === 'limited' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
                                Limited
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-subtle text-text-muted border border-border-default">
                                Booked
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Headline */}
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                          {creator.headline || creator.biography || 'Digital Creator & AI Artist'}
                        </p>

                        {/* Specialties & Tools */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {creator.specialties?.slice(0, 3).map((spec) => (
                              <span
                                key={spec}
                                className="text-[10px] px-2 py-0.5 rounded bg-surface-subtle text-text-secondary border border-border-default"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                          {creator.creativeTools && creator.creativeTools.length > 0 && (
                            <div className="flex items-center space-x-1 text-[11px] text-text-muted">
                              <span className="font-semibold text-text-secondary">Tools:</span>
                              <span>{creator.creativeTools.slice(0, 4).join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Public Portfolio Thumbnails */}
                        {hasPortfolio && (
                          <div className="pt-2">
                            <label className="text-[11px] font-semibold text-text-muted block mb-1.5">
                              Featured Public Work:
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {creator.portfolioItems.slice(0, 3).map((item) => (
                                <div
                                  key={item.id}
                                  className="group relative rounded-lg overflow-hidden border border-border-default/60 aspect-video bg-surface-subtle cursor-pointer"
                                  onClick={() =>
                                    setPreviewMedia({
                                      url: item.thumbnailUrl || item.mediaUrl,
                                      title: item.title,
                                      type: item.mediaType
                                    })
                                  }
                                >
                                  <img
                                    src={item.thumbnailUrl || item.mediaUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Pricing & Action Buttons */}
                      <div className="pt-4 mt-4 border-t border-border-default/40 flex items-center justify-between">
                        <div>
                          {primaryService ? (
                            <div>
                              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Starting at</span>
                              <span className="text-sm font-bold text-white font-mono">
                                {primaryService.currency} {primaryService.price.toLocaleString()}
                              </span>
                            </div>
                          ) : creator.hourlyRate ? (
                            <div>
                              <span className="text-[10px] text-text-muted uppercase tracking-wider block">Hourly Rate</span>
                              <span className="text-sm font-bold text-white font-mono">
                                ₹{creator.hourlyRate?.toLocaleString()}/hr
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted">Custom Quote</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Link to={`/creators/${creator.username || creator.id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              View Profile
                            </Button>
                          </Link>
                          <Link to={`/brand/briefs?creatorId=${creator.id}`}>
                            <Button variant="primary" size="sm" className="text-xs">
                              Match Brief
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-6 flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Previous
                </Button>
                <span className="text-xs text-text-muted px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
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
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[70vh]">
              {previewMedia.type === 'video' ? (
                <video src={previewMedia.url} controls className="max-h-[60vh] max-w-full rounded-lg" autoPlay />
              ) : (
                <img src={previewMedia.url} alt={previewMedia.title} className="max-h-[60vh] max-w-full object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
