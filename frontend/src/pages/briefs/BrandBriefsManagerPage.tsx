import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CampaignBrief, BriefStats } from '../../types';
import {
  getMyBrandBriefs,
  publishBrandBrief,
  pauseBrandBrief,
  resumeBrandBrief,
  archiveBrandBrief,
  deleteBrandBrief,
  extractErrorMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Plus,
  Layers,
  Sparkles,
  Clock,
  Play,
  Pause,
  Archive,
  Trash2,
  Edit2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  FileText
} from 'lucide-react';

export const BrandBriefsManagerPage: React.FC = () => {
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [stats, setStats] = useState<BriefStats>({
    total: 0,
    draft: 0,
    published: 0,
    paused: 0,
    archived: 0
  });
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deletion Modal
  const [deletingBriefId, setDeletingBriefId] = useState<string | null>(null);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyBrandBriefs({
        status: activeStatus !== 'all' ? activeStatus : undefined
      });
      setBriefs(res.briefs || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load campaign briefs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, [activeStatus]);

  const handlePublish = async (briefId: string) => {
    try {
      const updated = await publishBrandBrief(briefId);
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSuccessMessage('Campaign brief published to public discovery.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchBriefs();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to publish brief'));
    }
  };

  const handlePause = async (briefId: string) => {
    try {
      const updated = await pauseBrandBrief(briefId);
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSuccessMessage('Campaign brief paused.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchBriefs();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to pause brief'));
    }
  };

  const handleResume = async (briefId: string) => {
    try {
      const updated = await resumeBrandBrief(briefId);
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSuccessMessage('Campaign brief resumed and published.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchBriefs();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to resume brief'));
    }
  };

  const handleArchive = async (briefId: string) => {
    try {
      const updated = await archiveBrandBrief(briefId);
      setBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSuccessMessage('Campaign brief moved to archive.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchBriefs();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to archive brief'));
    }
  };

  const handleDelete = async (briefId: string) => {
    try {
      await deleteBrandBrief(briefId);
      setBriefs((prev) => prev.filter((b) => b.id !== briefId));
      setDeletingBriefId(null);
      setSuccessMessage('Campaign brief deleted.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchBriefs();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete brief'));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/brand/dashboard" className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span className="text-text-muted">/</span>
            <Badge variant="cyan" size="sm">
              Brand Hub
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            Campaign Briefs Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Author and orchestrate generative AI campaign briefs, track publication lifecycle, and connect with premier creators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/brand/briefs/new">
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Create New Brief
            </Button>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/40 text-status-success text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs hover:underline font-mono">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/40 text-status-error text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchBriefs}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Total Briefs
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <Layers className="w-5 h-5 text-accent" />
            <span>{stats.total}</span>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Live & Published
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <Sparkles className="w-5 h-5 text-status-success" />
            <span>{stats.published}</span>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Draft Briefs
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <FileText className="w-5 h-5 text-status-warning" />
            <span>{stats.draft}</span>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Paused / Archived
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <Clock className="w-5 h-5 text-text-muted" />
            <span>{stats.paused + stats.archived}</span>
          </div>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { id: 'all', label: `All Briefs (${stats.total})` },
          { id: 'published', label: `Published (${stats.published})` },
          { id: 'draft', label: `Drafts (${stats.draft})` },
          { id: 'paused', label: `Paused (${stats.paused})` },
          { id: 'archived', label: `Archived (${stats.archived})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeStatus === tab.id
                ? 'bg-accent text-background-dark font-bold'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Briefs List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} variant="elevated" className="p-6 space-y-3 animate-pulse border-border">
              <div className="h-6 bg-surface-muted rounded w-1/3" />
              <div className="h-4 bg-surface-muted rounded w-2/3" />
              <div className="h-4 bg-surface-muted rounded w-1/4" />
            </Card>
          ))}
        </div>
      ) : briefs.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center border-border space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-accent">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary font-display">
            {activeStatus === 'all' ? 'No campaign briefs created yet' : `No ${activeStatus} briefs`}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Draft a creative brief outlining your requirements, budget, deliverables, and timeline to discover AI creators.
          </p>
          <Link to="/brand/briefs/new">
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Create Brief Now
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <Card
              key={brief.id}
              variant="elevated"
              className="p-6 sm:p-7 border-border hover:border-accent/40 transition-all duration-300 space-y-5"
            >
              {/* Top Row: Title, Status, Category */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        brief.status === 'published'
                          ? 'success'
                          : brief.status === 'draft'
                          ? 'warning'
                          : brief.status === 'paused'
                          ? 'cyan'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {brief.status.toUpperCase()}
                    </Badge>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-surface-elevated text-text-muted border border-border">
                      {brief.category}
                    </span>
                    <span className="text-xs text-text-muted">
                      Created {new Date(brief.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-text-primary font-display">
                    {brief.title}
                  </h3>
                  {brief.summary && (
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                      {brief.summary}
                    </p>
                  )}
                </div>

                {/* Budget Badge */}
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-mono text-text-muted uppercase block">Estimated Budget</span>
                  <div className="text-xl sm:text-2xl font-black text-text-primary font-display">
                    ₹{brief.budgetMin.toLocaleString()} – ₹{brief.budgetMax.toLocaleString()}
                  </div>
                  <span className="text-[11px] font-mono text-accent">{brief.currency}</span>
                </div>
              </div>

              {/* Requirements & Deliverables Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/60 text-xs">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-text-muted font-mono block mb-1">
                    Specialties
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {brief.requiredSpecialties && brief.requiredSpecialties.length > 0 ? (
                      brief.requiredSpecialties.slice(0, 3).map((spec, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface-muted text-text-secondary text-[10px]">
                          {spec}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted text-[11px]">Open / Flexible</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase text-text-muted font-mono block mb-1">
                    Key Deliverables
                  </span>
                  <span className="text-text-secondary">
                    {brief.deliverables && brief.deliverables.length > 0
                      ? `${brief.deliverables.length} item${brief.deliverables.length > 1 ? 's' : ''} specified`
                      : 'Not defined yet'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase text-text-muted font-mono block mb-1">
                    Engagement & Location
                  </span>
                  <span className="text-text-secondary capitalize">
                    {brief.engagementType} • {brief.locationPreference}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                {/* State Machine Transition Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {brief.status === 'draft' && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => handlePublish(brief.id)}
                    >
                      Publish Brief
                    </Button>
                  )}

                  {brief.status === 'published' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Pause className="w-3.5 h-3.5" />}
                      onClick={() => handlePause(brief.id)}
                    >
                      Pause Brief
                    </Button>
                  )}

                  {brief.status === 'paused' && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => handleResume(brief.id)}
                    >
                      Resume Brief
                    </Button>
                  )}

                  {(brief.status === 'published' || brief.status === 'paused') && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Archive className="w-3.5 h-3.5" />}
                      onClick={() => handleArchive(brief.id)}
                    >
                      Archive
                    </Button>
                  )}

                  {brief.status === 'published' && (
                    <Link to={`/briefs/${brief.slug || brief.id}`} target="_blank">
                      <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Public View
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Edit & Delete */}
                <div className="flex items-center gap-2">
                  <Link to={`/brand/briefs/${brief.id}/edit`}>
                    <Button variant="secondary" size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                      Edit Brief
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-muted hover:text-status-error"
                    onClick={() => setDeletingBriefId(brief.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBriefId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <Card variant="elevated" className="w-full max-w-md p-6 border-status-error/40 space-y-4">
            <h3 className="text-lg font-bold text-text-primary font-display flex items-center gap-2 text-status-error">
              <AlertCircle className="w-5 h-5" /> Delete Campaign Brief
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to delete this brief? This will remove all associated creative requirements and public listings.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <Button variant="secondary" size="sm" onClick={() => setDeletingBriefId(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deletingBriefId)}>
                Yes, Delete Brief
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
