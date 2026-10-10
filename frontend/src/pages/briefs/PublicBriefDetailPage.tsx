import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CampaignBrief } from '../../types';
import { getPublicBriefByIdOrSlug, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  MapPin,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  Globe,
  AlertCircle,
  FileText
} from 'lucide-react';

export const PublicBriefDetailPage: React.FC = () => {
  const { briefIdOrSlug } = useParams<{ briefIdOrSlug: string }>();
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrief = async () => {
      if (!briefIdOrSlug) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicBriefByIdOrSlug(briefIdOrSlug);
        setBrief(data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Campaign brief not found or is no longer publicly accessible.'));
      } finally {
        setLoading(false);
      }
    };
    fetchBrief();
  }, [briefIdOrSlug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-6 animate-pulse">
        <div className="h-8 bg-surface-muted rounded w-1/3 mx-auto" />
        <div className="h-10 bg-surface-muted rounded w-2/3 mx-auto" />
        <div className="h-64 bg-surface-muted rounded-2xl" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-status-error">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary font-display">Campaign Brief Not Found</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {error || 'This campaign brief may have concluded, been paused, or removed by the authoring brand.'}
        </p>
        <Link to="/briefs">
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Campaign Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fadeIn text-left">
      {/* Back Button */}
      <div>
        <Link
          to="/briefs"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Campaign Directory
        </Link>
      </div>

      {/* Hero Brief Header */}
      <Card variant="glass" className="p-6 sm:p-10 border-border relative overflow-hidden">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="cyan" size="md">
              {brief.category}
            </Badge>
            <span className="text-xs font-mono text-text-muted">
              Published {brief.publishedAt ? new Date(brief.publishedAt).toLocaleDateString() : 'Recently'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display leading-tight">
            {brief.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
            <span className="flex items-center gap-1.5 text-text-primary font-semibold">
              <Building className="w-4 h-4 text-accent" /> {brief.companyName}
            </span>
            <span>•</span>
            <span className="capitalize">{brief.engagementType} Project</span>
            <span>•</span>
            <span className="capitalize">{brief.locationPreference}</span>
          </div>
        </div>
      </Card>

      {/* Main Grid: Content (Left) & Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Brief Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Narrative Description */}
          <Card variant="glass" className="p-6 sm:p-8 border-border space-y-4">
            <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" /> Project Overview & Creative Narrative
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {brief.description || brief.summary}
            </p>
          </Card>

          {/* Key Deliverables */}
          <Card variant="glass" className="p-6 sm:p-8 border-border space-y-4">
            <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" /> Required Deliverables Checklist
            </h2>
            <div className="space-y-2.5 pt-2">
              {brief.deliverables && brief.deliverables.length > 0 ? (
                brief.deliverables.map((deliv, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-surface-elevated/70 border border-border/60 text-sm text-text-primary"
                  >
                    <div className="p-1 rounded bg-accent/15 text-accent mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span>{deliv}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-muted">Specific deliverables will be determined during scoping.</p>
              )}
            </div>
          </Card>

          {/* Creative Skills & Tools */}
          <Card variant="glass" className="p-6 sm:p-8 border-border space-y-6">
            <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> Technical & Aesthetic Requirements
            </h2>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-2">
                  Specialties Required:
                </span>
                <div className="flex flex-wrap gap-2">
                  {brief.requiredSpecialties && brief.requiredSpecialties.length > 0 ? (
                    brief.requiredSpecialties.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg text-xs bg-surface-elevated text-text-primary border border-border"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">Open to all creative disciplines.</span>
                  )}
                </div>
              </div>

              {brief.creativeTools && brief.creativeTools.length > 0 && (
                <div>
                  <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-2">
                    Recommended Tools / Software:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.creativeTools.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded text-xs font-mono bg-surface-muted text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Reference Moodboard Links */}
          {brief.referenceUrls && brief.referenceUrls.length > 0 && (
            <Card variant="glass" className="p-6 sm:p-8 border-border space-y-4">
              <h3 className="text-lg font-bold text-text-primary font-display">Visual References & Moodboards</h3>
              <div className="space-y-2">
                {brief.referenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-accent hover:underline font-mono truncate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{url}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Budget, Terms, Brand & Action Card */}
        <div className="space-y-6">
          {/* Budget & Terms Card */}
          <Card variant="elevated" className="p-6 border-border space-y-6">
            <div>
              <span className="text-xs font-mono text-text-muted uppercase block mb-1">
                Estimated Project Budget
              </span>
              <div className="text-3xl font-black text-text-primary font-display">
                ₹{brief.budgetMin.toLocaleString()} – ₹{brief.budgetMax.toLocaleString()}
              </div>
              <span className="text-xs font-mono text-accent">{brief.currency} Total Compensation</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-border/60 text-xs">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" /> Estimated Duration
                </span>
                <span className="font-semibold text-text-primary">{brief.durationWeeks} Weeks</span>
              </div>

              {brief.targetStartDate && (
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-accent" /> Target Start Date
                  </span>
                  <span className="font-semibold text-text-primary">
                    {new Date(brief.targetStartDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {brief.deadline && (
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-status-warning" /> Delivery Deadline
                  </span>
                  <span className="font-semibold text-text-primary">
                    {new Date(brief.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-accent" /> Location Model
                </span>
                <span className="font-semibold text-text-primary capitalize">{brief.locationPreference}</span>
              </div>
            </div>

            {/* Proposal CTA Box */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-accent/40 space-y-3">
              <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                <Sparkles className="w-4 h-4" /> Creator Pitch Studio Active
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Submit a custom creative pitch, commercial terms, milestone breakdown, and verified portfolio evidence directly to this brand.
              </p>
              <Link to={`/creator/proposals/new/${brief.id}`}>
                <Button variant="primary" size="md" className="w-full">
                  Submit Proposal & Pitch
                </Button>
              </Link>
            </div>
          </Card>

          {/* Brand Attribution Card */}
          <Card variant="glass" className="p-6 border-border space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted font-mono">
              About the Brand
            </h3>

            <div className="space-y-2">
              <h4 className="text-base font-bold text-text-primary font-display flex items-center gap-2">
                <Building className="w-4 h-4 text-accent" /> {brief.companyName}
              </h4>
              {brief.brand?.industry && (
                <p className="text-xs text-text-secondary">
                  Industry: <span className="text-text-primary font-medium">{brief.brand.industry}</span>
                </p>
              )}
              {brief.brand?.companySize && (
                <p className="text-xs text-text-secondary">
                  Company Size: <span className="text-text-primary font-medium">{brief.brand.companySize}</span>
                </p>
              )}
              {brief.brand?.website && (
                <a
                  href={brief.brand.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline pt-1 font-mono"
                >
                  <Globe className="w-3.5 h-3.5" /> Company Website
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
