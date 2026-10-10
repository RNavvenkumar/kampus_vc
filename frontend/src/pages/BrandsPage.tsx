import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BriefPreviewCard } from '../components/marketplace/BriefPreviewCard';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  FileEdit,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const BrandsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      {/* Top Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <Badge variant="cyan" size="md">
          Kampus for Brands & Agencies
        </Badge>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-text-primary font-display">
          Precision Creative Talent for Visionary Campaigns
        </h1>
        <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
          Say goodbye to browsing hundreds of disconnected social profiles. Turn your campaign ideas into structured briefs and discover verified creators with explainable portfolio matching.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link to="/signup?role=brand">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
              Create a Campaign Brief
            </Button>
          </Link>
          <Link to="/explore">
            <Button variant="secondary" size="lg">
              Explore Creator Directory
            </Button>
          </Link>
        </div>
      </div>

      {/* Interactive Brief Preview Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-accent uppercase font-bold tracking-wider">
            <FileEdit className="w-4 h-4" /> AI Brief Generator Preview
          </div>
          <h2 className="text-3xl font-extrabold text-text-primary font-display">
            From raw concept to structured brief in seconds.
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Simply input your rough ideas, target audience, and preferred visual references. Our AI assistant structures deliverables, estimates realistic production timelines, and highlights critical skill requirements for creator matching.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-text-primary">100% Editable & Reviewable</h4>
                <p className="text-xs text-text-secondary">AI outputs are always drafts for you to refine and approve before publication.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-text-primary">No Fabricated Budgets</h4>
                <p className="text-xs text-text-secondary">You retain full control over your budget ranges, milestones, and currency settings.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <BriefPreviewCard />
        </div>
      </div>

      {/* Brand Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card variant="elevated" className="p-8 border-border">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
            <Sliders className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Explainable Matching</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Understand exactly why a creator is recommended based on visual DNA, color science, software mastery, and deliverable track records.
          </p>
        </Card>

        <Card variant="elevated" className="p-8 border-border">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Clear Licensing & Terms</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Define explicit commercial usage rights, channels, revision limits, and intellectual property terms before project kickoff.
          </p>
        </Card>

        <Card variant="elevated" className="p-8 border-border">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Milestone Workflows</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Structured milestone check-ins, deliverable previews, and approvals designed specifically for complex multi-asset digital campaigns.
          </p>
        </Card>
      </div>
    </div>
  );
};
