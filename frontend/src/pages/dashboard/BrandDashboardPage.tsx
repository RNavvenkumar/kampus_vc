import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CampaignBrief, BriefStats } from '../../types';
import { getMyBrandBriefs } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  ShieldCheck,
  Plus,
  Layers,
  FileText
} from 'lucide-react';

export const BrandDashboardPage: React.FC = () => {
  const { user, brandProfile } = useAuth();
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [stats, setStats] = useState<BriefStats>({
    total: 0,
    draft: 0,
    published: 0,
    paused: 0,
    archived: 0
  });

  useEffect(() => {
    const fetchDashboardBriefs = async () => {
      try {
        const res = await getMyBrandBriefs({ limit: 5 });
        setBriefs(res.briefs || []);
        if (res.stats) {
          setStats(res.stats);
        }
      } catch {
        // Fallback
      }
    };
    fetchDashboardBriefs();
  }, []);

  const completion = brandProfile?.profileCompletion || 25;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn text-left">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="cyan" size="sm">
              Brand & Agency Hub
            </Badge>
            <span className="text-xs font-mono text-text-muted">Account: {user?.email}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            {brandProfile?.companyName || user?.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {brandProfile?.industry || 'Digital Media & Marketing'} • {brandProfile?.companySize || '11-50'} Team Members
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/brand/creative-studio">
            <Button variant="primary" size="md" className="shadow-neon-glow" leftIcon={<Sparkles className="w-4 h-4 text-accent-cyan animate-pulse" />}>
              AI Creative Studio
            </Button>
          </Link>
          <Link to="/brand/briefs">
            <Button variant="secondary" size="md" leftIcon={<Briefcase className="w-4 h-4" />}>
              Manage Briefs
            </Button>
          </Link>
          <Link to="/brand/briefs/new">
            <Button variant="outline" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Manual Brief
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics & Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Profile Score */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-text-muted font-mono">
                Brand Profile
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
            Edit brand information <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Total Campaigns */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
              Total Campaigns
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
              <Layers className="w-5 h-5 text-accent" />
              <span>{stats.total} Briefs</span>
            </div>
          </div>
          <Link to="/brand/briefs" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
            View all briefs <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Active Published Campaigns */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
              Active in Marketplace
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-status-success font-display">
              <Sparkles className="w-5 h-5" />
              <span>{stats.published} Live</span>
            </div>
          </div>
          <Link to="/briefs" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
            Explore public directory <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Drafts */}
        <Card variant="elevated" className="p-5 border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
              Draft Briefs
            </span>
            <div className="flex items-center gap-2 text-2xl font-bold text-status-warning font-display">
              <FileText className="w-5 h-5" />
              <span>{stats.draft} Incomplete</span>
            </div>
          </div>
          <Link to="/brand/briefs/new" className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 pt-2">
            Author new brief <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>
      </div>

      {/* Recent Briefs & Quick Action Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Briefs Table/List */}
        <Card variant="glass" className="p-6 sm:p-8 lg:col-span-2 border-border space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-accent" /> Recent Campaign Briefs
            </h2>
            <Link to="/brand/briefs">
              <Button variant="secondary" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {briefs.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface-elevated/40 border border-border text-center space-y-3">
              <p className="text-xs text-text-secondary">
                You have not authored any campaign briefs yet.
              </p>
              <Link to="/brand/briefs/new">
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Create First Campaign Brief
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {briefs.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-surface-elevated/50 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          b.status === 'published'
                            ? 'success'
                            : b.status === 'draft'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {b.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-text-muted font-mono">{b.category}</span>
                    </div>
                    <h4 className="text-sm font-bold text-text-primary font-display">
                      {b.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-mono text-text-secondary">
                      ₹{b.budgetMin.toLocaleString()} – ₹{b.budgetMax.toLocaleString()}
                    </span>
                    <Link to={`/brand/briefs/${b.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Company Details */}
        <Card variant="glass" className="p-6 sm:p-8 border-border flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-3">Company Information</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {brandProfile?.description ||
                'Add your company story, core values, and creative objectives in Settings to build trust with creators.'}
            </p>

            <div className="mt-4 pt-4 border-t border-border/60 text-xs text-text-muted space-y-1.5">
              <div>Contact Lead: <strong className="text-text-primary">{brandProfile?.contactName || user?.name}</strong></div>
              <div>Location: <strong className="text-text-primary">{brandProfile?.location || 'Global Remote'}</strong></div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1 text-accent">
              <ShieldCheck className="w-4 h-4" /> Enterprise Brand Partner
            </span>
            <Link to="/settings" className="text-accent hover:underline font-semibold">
              Edit Settings →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
