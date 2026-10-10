import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PortfolioItem, ServiceItem, CreatorAvailability, ProjectHistoryItem } from '../../types';
import {
  getMyPortfolio,
  getMyServices,
  getCreatorAvailability,
  getProjectHistory
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  Layers,
  ExternalLink,
  ShieldCheck,
  Package,
  Plus,
  ArrowRight,
  History,
  Star,
  RefreshCw
} from 'lucide-react';

export const CreatorDashboardPage: React.FC = () => {
  const { user, creatorProfile } = useAuth();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [availabilityData, setAvailabilityData] = useState<CreatorAvailability | null>(null);
  const [historyItems, setHistoryItems] = useState<ProjectHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadProjectHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await getProjectHistory();
      setHistoryItems(data || []);
    } catch (e) {
      console.error('Failed to load project history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [portRes, servRes, availRes, histRes] = await Promise.all([
          getMyPortfolio().catch(() => ({ items: [], total: 0 })),
          getMyServices().catch(() => ({ services: [], total: 0 })),
          getCreatorAvailability().catch(() => null),
          getProjectHistory().catch(() => [])
        ]);
        setPortfolioItems(portRes.items || []);
        setServices(servRes.services || []);
        if (availRes) setAvailabilityData(availRes);
        setHistoryItems(histRes || []);
      } catch {
        // Fallback
      }
    };
    loadDashboardData();
  }, []);

  const completion = creatorProfile?.profileCompletion || 20;
  const currentAvailability = availabilityData?.availability || creatorProfile?.availability || 'available';
  const publicUsername = creatorProfile?.username || user?.name?.toLowerCase().replace(/\s+/g, '') || user?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn text-left">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">
              Creator Studio
            </Badge>
            <span className="text-xs font-mono text-text-muted">Account: {user?.email}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            Welcome back, {creatorProfile?.displayName || user?.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {creatorProfile?.headline || 'AI Artist & Digital Creator'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={showHistory ? 'primary' : 'secondary'}
            size="md"
            leftIcon={<History className="w-4 h-4 text-amber-400" />}
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) loadProjectHistory();
            }}
            className={showHistory ? 'bg-amber-600 hover:bg-amber-500 text-white border-0 shadow-lg shadow-amber-500/20' : ''}
          >
            {showHistory ? 'Dashboard Overview' : 'Collaboration History'}
          </Button>
          <Link to={`/creators/${publicUsername}`}>
            <Button variant="secondary" size="md" rightIcon={<ExternalLink className="w-4 h-4" />}>
              Public Profile
            </Button>
          </Link>
          <Link to="/creator/portfolio">
            <Button variant="primary" size="md" leftIcon={<Layers className="w-4 h-4" />}>
              Manage Portfolio
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics & Completion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Profile Completion Card */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-text-muted font-mono">
                Completeness
              </span>
              <Badge variant={completion >= 80 ? 'success' : 'warning'} size="sm">
                {completion}%
              </Badge>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden mb-3 border border-border">
              <div
                className="h-full bg-accent transition-all duration-500 rounded-full"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          <Link to="/settings" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
            Edit profile details <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Client Rating Card */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
              Client Rating & Trust
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-amber-400 font-display">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>
                {historyItems.filter((h) => h.rating).length > 0
                  ? (
                      historyItems
                        .filter((h) => h.rating)
                        .reduce((sum, h) => sum + (h.rating || 0), 0) /
                      historyItems.filter((h) => h.rating).length
                    ).toFixed(1)
                  : (creatorProfile?.averageRating || 5.0).toFixed(1)}{' '}
                <span className="text-xs text-text-muted font-normal font-sans">
                  ({historyItems.filter((h) => h.rating).length} Reviews)
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowHistory(true);
              loadProjectHistory();
            }}
            className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1 pt-2 text-left"
          >
            View Brand Reviews <ArrowRight className="w-3 h-3" />
          </button>
        </Card>

        {/* Portfolio Assets Card */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
              Portfolio Assets
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
              <Layers className="w-5 h-5 text-accent" />
              <span>{portfolioItems.length} Assets</span>
            </div>
          </div>
          <Link to="/creator/portfolio" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
            Open Portfolio Studio <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Services Count Card */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
              Service Packages
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
              <Package className="w-5 h-5 text-accent" />
              <span>{services.filter((s) => s.status === 'active').length} Active</span>
            </div>
          </div>
          <Link to="/creator/services" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
            Manage Packages <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Work Bandwidth Card */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-2">
              Work Bandwidth
            </span>
            <Badge
              variant={
                currentAvailability === 'available'
                  ? 'success'
                  : currentAvailability === 'limited'
                  ? 'warning'
                  : 'error'
              }
              size="md"
            >
              {currentAvailability === 'available'
                ? '● Available for Work'
                : currentAvailability === 'limited'
                ? '◐ Limited'
                : '○ Busy'}
            </Badge>
          </div>
          <Link to="/creator/services" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
            Update Availability Calendar <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>
      </div>

      {/* Collaboration History View */}
      {showHistory ? (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-text-primary font-display flex items-center gap-2">
                <History className="w-6 h-6 text-amber-400" /> Brand Collaboration & Client Reviews
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Records of brands you worked with, milestone deliverables, earnings, and their verified reviews.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />}
                onClick={loadProjectHistory}
                disabled={isLoadingHistory}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="p-16 text-center">
              <RefreshCw className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-muted">Loading collaboration records...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <Card variant="elevated" className="p-12 text-center border-border space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center mx-auto text-amber-400">
                <History className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-text-primary font-display">No Collaborations Recorded Yet</h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Once brand clients approve your deliverables and milestones, your collaboration history, ratings, and testimonials will appear here.
              </p>
              <div className="pt-2">
                <Link to="/briefs">
                  <Button variant="primary" size="sm">
                    Find Campaign Briefs
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {historyItems.map((item) => (
                <Card
                  key={item.id}
                  variant="elevated"
                  className="p-6 border-border hover:border-accent/40 transition-all rounded-2xl space-y-4 bg-surface-elevated/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                    {/* Brand Client Info */}
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          item.brand.avatar ||
                          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80'
                        }
                        alt={item.brand.name}
                        className="w-12 h-12 rounded-xl object-cover border border-border"
                      />
                      <div>
                        <h4 className="text-base font-bold text-text-primary font-display">
                          {item.brand.name}
                        </h4>
                        <p className="text-xs text-text-secondary">
                          {item.brand.industry || 'Brand Client'}
                        </p>
                      </div>
                    </div>

                    {/* Earnings & Status */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-mono text-text-muted block">Contract Value</span>
                        <span className="text-lg font-black text-emerald-400 font-display">
                          ₹{item.agreedPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <Badge
                        variant={item.status === 'completed' ? 'success' : 'cyan'}
                        size="md"
                      >
                        {item.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted">
                    <div>
                      <span className="text-text-primary font-semibold">{item.title}</span>
                      {item.projectReference && (
                        <span className="ml-2 font-mono text-text-muted">({item.projectReference})</span>
                      )}
                    </div>
                    <div>
                      Date:{' '}
                      <span className="text-text-secondary font-mono">
                        {new Date(item.completedAt || item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Client Review & Rating */}
                  {item.rating ? (
                    <div className="p-4 rounded-xl bg-surface-muted/70 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= item.rating!
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-amber-400 ml-1.5">
                            {item.rating}.0 / 5.0 Star Rating
                          </span>
                        </div>
                        {item.reviewedAt && (
                          <span className="text-[11px] text-text-muted font-mono">
                            Received {new Date(item.reviewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {item.review && (
                        <p className="text-xs text-gray-200 italic leading-relaxed pt-1">
                          "{item.review}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-surface-muted/40 border border-border text-xs text-text-muted">
                      Milestone deliverable pending final review from brand.
                    </div>
                  )}

                  {/* Action Link */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Link to={`/projects/${item.projectId}`}>
                      <Button variant="secondary" size="sm">
                        View Workspace
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Regular Quick Actions & Recent Showcase */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Portfolio Items */}
          <Card variant="glass" className="p-6 sm:p-8 lg:col-span-2 border-border space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent" /> Featured Portfolio Works
              </h2>
              <Link to="/creator/portfolio">
                <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Add Item
                </Button>
              </Link>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-elevated/40 border border-border text-center space-y-3">
                <p className="text-xs text-text-secondary">
                  You have not added any artwork or video assets to your portfolio yet.
                </p>
                <Link to="/creator/portfolio">
                  <Button variant="primary" size="sm">
                    Upload First Creative Asset
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portfolioItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl overflow-hidden border border-border/70 bg-surface-elevated/50 flex flex-col group"
                  >
                    <div className="h-36 w-full bg-surface-muted overflow-hidden relative">
                      <img
                        src={item.thumbnailUrl || item.mediaUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="cyan" size="sm">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-bold text-text-primary font-display truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-text-muted capitalize">
                        Visibility: {item.visibility}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Specialties and Tools */}
          <Card variant="glass" className="p-6 sm:p-8 border-border flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" /> Creative Profile Focus
              </h3>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-text-muted uppercase font-mono block mb-2">Specialties:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {creatorProfile?.specialties && creatorProfile.specialties.length > 0 ? (
                      creatorProfile.specialties.map((spec, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-surface-elevated text-xs text-text-primary border border-border"
                        >
                          {spec}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-muted">No specialties specified yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-text-muted uppercase font-mono block mb-2">Creative Software:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {creatorProfile?.creativeTools && creatorProfile.creativeTools.length > 0 ? (
                      creatorProfile.creativeTools.map((tool, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-muted text-text-secondary border border-border/40"
                        >
                          {tool}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-muted">No tools added yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
              <span className="flex items-center gap-1 text-accent">
                <ShieldCheck className="w-4 h-4" /> Verified Creator
              </span>
              <Link to="/settings" className="text-accent hover:underline font-semibold">
                Edit in Settings →
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
