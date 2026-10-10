import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Calendar, DollarSign, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BriefPreviewCard: React.FC = () => {
  return (
    <Card variant="glass" className="p-6 sm:p-7 max-w-xl mx-auto border-border/80 shadow-card-dark">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan" size="sm">
              <Sparkles className="w-3 h-3 mr-1" /> AI-Assisted Brief
            </Badge>
            <span className="text-[11px] font-mono text-text-muted">Draft #BR-9042</span>
          </div>
          <h4 className="text-lg font-bold text-text-primary">
            Next-Gen Spatial Audio Hardware Launch Trailer
          </h4>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed mb-5">
        Seeking a 3D Motion Director & Sound Designer to produce a 30s 4K teaser showcasing procedural acoustic waves and titanium headset exploded views.
      </p>

      {/* Structured Deliverables */}
      <div className="space-y-2 mb-5">
        <span className="text-xs font-semibold text-text-muted uppercase font-mono">
          Required Deliverables
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-surface-elevated border border-border/60 text-text-primary">
            • 1x 30s Hero 4K 60fps Video
          </div>
          <div className="p-2 rounded bg-surface-elevated border border-border/60 text-text-primary">
            • 4x Vertical 9:16 Social Cuts
          </div>
        </div>
      </div>

      {/* Meta details */}
      <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 text-text-muted">
          <span className="flex items-center gap-1 font-semibold text-text-primary">
            <DollarSign className="w-3.5 h-3.5 text-accent" /> $4,500 – $6,000
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> 3 Weeks Timeline
          </span>
        </div>
        <Link to="/brands">
          <Button variant="ghost" size="sm" className="text-accent hover:text-accent font-medium p-0" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Explore Brief Builder
          </Button>
        </Link>
      </div>
    </Card>
  );
};
