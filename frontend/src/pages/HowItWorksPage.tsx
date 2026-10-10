import React from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  MessageSquare,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Project Briefing & Intent Structuring',
      desc: 'The client provides an idea or raw brief. Kampus AI analyzes the requirements and structures them into clear deliverables, technical specs, and budget constraints.',
      icon: <FileText className="w-6 h-6 text-accent" />
    },
    {
      step: '02',
      title: 'Explainable Creator Discovery',
      desc: 'Matching algorithms evaluate creator portfolios, Creative DNA signatures, tools, and real availability, generating recommendations with transparent matching rationales.',
      icon: <Search className="w-6 h-6 text-accent" />
    },
    {
      step: '03',
      title: 'Proposal & Milestone Agreement',
      desc: 'Selected creators submit detailed proposals with milestones, timelines, and deliverable items. Both parties confirm project scope and terms before work begins.',
      icon: <MessageSquare className="w-6 h-6 text-accent" />
    },
    {
      step: '04',
      title: 'Collaborative Delivery & Feedback',
      desc: 'Work progresses in structured stages. Feedback, revisions, asset approvals, and final asset handoffs are managed seamlessly within the platform.',
      icon: <CheckCircle2 className="w-6 h-6 text-accent" />
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">
      <SectionHeader
        pillText="The Collaboration Standard"
        title="How Creative Partnerships Thrive on Kampus.VC"
        subtitle="A transparent, portfolio-first workflow designed to eliminate friction between top digital talent and modern brands."
        align="center"
      />

      {/* Steps List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {steps.map((item) => (
          <Card key={item.step} variant="glass" className="p-8 border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-2xl font-black font-display text-accent/50 font-mono">
                {item.step}
              </span>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">{item.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-8">
        <Link to="/signup">
          <Button variant="glow" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
            Get Started with Kampus.VC
          </Button>
        </Link>
      </div>
    </div>
  );
};
