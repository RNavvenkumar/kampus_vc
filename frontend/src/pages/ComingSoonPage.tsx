import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Rocket } from 'lucide-react';

export const ComingSoonPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const routeDetails: Record<string, { title: string; phase: string; description: string }> = {
    '/dashboard': {
      title: 'Workspace Dashboard',
      phase: 'Workspace Center',
      description: 'Your central command center for active briefs, incoming proposals, and project milestones.'
    },
    '/creator/dashboard': {
      title: 'Creator Studio Dashboard',
      phase: 'Creator Studio',
      description: 'Manage your portfolio items, rate settings, availability, and client inquiries.'
    },
    '/brand/dashboard': {
      title: 'Brand Campaign Manager',
      phase: 'Brand Operations',
      description: 'Review AI brief drafts, track incoming creator proposals, and manage project deliverables.'
    },
    '/briefs': {
      title: 'Campaign Briefs Workspace',
      phase: 'Campaign Studio',
      description: 'Full AI-assisted campaign brief generator, structured deliverable requirements, and revision settings.'
    },
    '/projects': {
      title: 'Active Projects & Milestones',
      phase: 'Project Operations',
      description: 'Structured stage-by-stage deliverable reviews, client approvals, and contract terms.'
    },
    '/messages': {
      title: 'Direct Creative Messaging',
      phase: 'Direct Messaging',
      description: 'Real-time project chats, attachment sharing, and notification streams.'
    },
    '/calls': {
      title: 'Live Video Collaboration Room',
      phase: 'Video Suite',
      description: 'Real-time video/audio calling and screen sharing for creative direction review.'
    },
    '/settings': {
      title: 'Account & Security Settings',
      phase: 'Security & Profile',
      description: 'Security configurations, notification preferences, and billing profiles.'
    }
  };

  const details = routeDetails[path] || {
    title: 'Feature Workspace',
    phase: 'Creator Marketplace',
    description: 'This area of Kampus.VC is optimized for verified creative collaboration.'
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Card variant="glass" className="w-full max-w-lg p-8 sm:p-10 border-accent/30 text-center shadow-card-dark">
        <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
          <Rocket className="w-6 h-6 text-accent" />
        </div>

        <Badge variant="cyan" size="md" className="mb-4">
          {details.phase}
        </Badge>

        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-display mb-3">
          {details.title}
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed mb-8 max-w-md mx-auto">
          {details.description}
        </p>

        <div className="p-4 rounded-xl bg-surface-elevated/70 border border-border/80 text-xs text-text-muted mb-8 text-left space-y-1 font-mono">
          <div><strong>Requested Route:</strong> {path}</div>
          <div><strong>Status:</strong> Architecture Prepared & Scheduled</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button variant="secondary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Home
            </Button>
          </Link>
          <Link to="/explore">
            <Button variant="primary" size="md">
              Explore Creators
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
