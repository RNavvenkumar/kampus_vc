import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CreatorCard } from '../components/marketplace/CreatorCard';
import { CreativeDnaPreview } from '../components/marketplace/CreativeDnaPreview';
import { DEMO_CREATORS } from '../services/api';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Workflow,
  Zap,
  Target
} from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col space-y-24 sm:space-y-32 pb-24 overflow-hidden">
      {/* =========================================================================
          HERO SECTION
      ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 lg:pt-28 pb-12 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] bg-accent/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Top pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-elevated/80 border border-border/80 text-xs font-medium text-text-secondary backdrop-blur-md shadow-glow-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Next-Generation AI Creator Marketplace</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-text-primary leading-[1.08] font-display">
              Find the <span className="gradient-text-cyan">creative mind</span> behind your next big idea.
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed font-normal">
              Discover distinctive creators, turn ideas into clear briefs, and build better creative partnerships with AI-assisted discovery and portfolio-first matching.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/explore">
                <Button variant="glow" size="lg" className="w-full sm:w-auto px-8" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Find a Creator
                </Button>
              </Link>
              <Link to="/signup?role=creator">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8" leftIcon={<Sparkles className="w-4 h-4 text-accent" />}>
                  Showcase Your Work
                </Button>
              </Link>
            </div>

            {/* Trust signals (Truthful, non-fabricated) */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" /> Portfolio-Led Discovery
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" /> Explainable AI Matching
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-accent" /> Creator-Owned DNA Passport
              </span>
            </div>
          </div>

          {/* Dynamic Portfolio Showcase Grid */}
          <div className="mt-16 sm:mt-20 max-w-6xl mx-auto">
            <div className="relative rounded-2xl p-2 sm:p-3 bg-surface-elevated/40 border border-border/80 backdrop-blur-xl shadow-card-dark">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hero Feature 1: Elena Vance */}
                <div className="relative rounded-xl overflow-hidden group h-80 md:h-96 bg-surface border border-border/60">
                  <img
                    src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80"
                    alt="AI Concept Art"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] uppercase tracking-wider font-mono text-accent font-semibold">
                      Generative AI & Worldbuilding
                    </span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">Elena Vance</h3>
                    <p className="text-xs text-text-secondary line-clamp-1">Atmospheric Sci-Fi Megastructures</p>
                  </div>
                </div>

                {/* Hero Feature 2: Marcus Sterling */}
                <div className="relative rounded-xl overflow-hidden group h-80 md:h-96 bg-surface border border-border/60">
                  <img
                    src="https://images.unsplash.com/photo-1633493106115-467268875501?w=1000&auto=format&fit=crop&q=80"
                    alt="3D Kinetic Design"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] uppercase tracking-wider font-mono text-accent font-semibold">
                      3D Kinetic Motion & VFX
                    </span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">Marcus Sterling</h3>
                    <p className="text-xs text-text-secondary line-clamp-1">Industrial Hardware Visuals</p>
                  </div>
                </div>

                {/* Hero Feature 3: Devon Thorne */}
                <div className="relative rounded-xl overflow-hidden group h-80 md:h-96 bg-surface border border-border/60">
                  <img
                    src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80"
                    alt="AI Video Direction"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] uppercase tracking-wider font-mono text-accent font-semibold">
                      Synthetic Video Direction
                    </span>
                    <h3 className="text-lg font-bold text-text-primary mt-1">Devon Thorne</h3>
                    <p className="text-xs text-text-secondary line-clamp-1">Cinematic Narrative Teasers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          DISCOVERY PREVIEW SECTION
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <Badge variant="cyan" size="md" className="mb-3">
              Marketplace Preview
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
              Featured Creative Talent
            </h2>
            <p className="text-sm sm:text-base text-text-secondary mt-2 max-w-xl">
              Explore demonstration creator profiles spanning AI concept art, 3D procedural VFX, visual identity, and short-form synthetic cinema.
            </p>
          </div>
          <Link to="/explore">
            <Button variant="outline" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explore All Creators
            </Button>
          </Link>
        </div>

        {/* Grid of Creator Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEMO_CREATORS.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS SECTION
      ========================================================================= */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          pillText="Collaboration Lifecycle"
          title="How Kampus.VC Works"
          subtitle="From early idea to final creative delivery, our platform structures the collaboration so everyone stays aligned."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <Card variant="elevated" className="p-8 border-border hover:border-accent/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-6 font-display font-bold text-xl">
              01
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">Describe the Project</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Share your campaign goal, medium, budget, deliverables, and timeline. Our AI assistant helps turn natural-language ideas into structured, actionable briefs.
            </p>
            <div className="pt-4 border-t border-border/60 text-xs text-accent flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5" /> AI-Assisted Brief Drafting
            </div>
          </Card>

          {/* Step 2 */}
          <Card variant="elevated" className="p-8 border-border hover:border-accent/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-6 font-display font-bold text-xl">
              02
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">Discover the Right Creators</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Explore portfolios and AI matching recommendations with clear, transparent reasons explaining why a creator fits your aesthetic and technical needs.
            </p>
            <div className="pt-4 border-t border-border/60 text-xs text-accent flex items-center gap-1 font-medium">
              <Target className="w-3.5 h-3.5" /> Explainable Matching Signals
            </div>
          </Card>

          {/* Step 3 */}
          <Card variant="elevated" className="p-8 border-border hover:border-accent/30 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mb-6 font-display font-bold text-xl">
              03
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-3">Collaborate with Clarity</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              Agree on deliverables and pricing, manage revisions, track milestones, and approve finished assets in one unified workspace.
            </p>
            <div className="pt-4 border-t border-border/60 text-xs text-accent flex items-center gap-1 font-medium">
              <Workflow className="w-3.5 h-3.5" /> Milestone & Approval Tracking
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          DIFFERENTIATION & CORE INNOVATIONS
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          pillText="Product Differentiation"
          title="Engineered for Modern Creative Workflows"
          subtitle="We move beyond basic directory listings with explainable intelligence and creator-first architecture."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Cpu className="w-5 h-5 text-accent" />
                <h4 className="text-base font-bold text-text-primary">Creative DNA Passport™</h4>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                A structured representation of a creator’s aesthetic tendencies, mediums, lighting signatures, and preferred tools. Fully creator-reviewed and transparent.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-accent" />
                <h4 className="text-base font-bold text-text-primary">Explainable AI Matching</h4>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                No black-box opacity. Recommendations show explicit reasons such as palette harmony, tool mastery, and similar portfolio deliverables.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-accent" />
                <h4 className="text-base font-bold text-text-primary">Evidence-Backed Verification</h4>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Reputation built on verified deliverable history, communication responsiveness, and real collaboration feedback rather than vanity follower counts.
              </p>
            </div>
          </div>

          <div>
            <CreativeDnaPreview />
          </div>
        </div>
      </section>

      {/* =========================================================================
          CREATOR & BRAND VALUE PROPOSITIONS
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Creator Box */}
          <Card variant="glass" className="p-8 sm:p-10 border-border/80 flex flex-col justify-between">
            <div className="space-y-4 mb-8">
              <Badge variant="cyan" size="sm">
                For Digital & AI Creators
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-bold text-text-primary font-display">
                Get discovered by clients who value your distinctive style.
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Present your portfolio with rich visual context, define your rates and availability, and receive structured briefs instead of vague inquiries.
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> Creator-owned Creative DNA profile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> Direct inquiries & structured proposals
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> Milestone-based project management
                </li>
              </ul>
            </div>
            <Link to="/signup?role=creator">
              <Button variant="primary" size="md" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Join as a Creator
              </Button>
            </Link>
          </Card>

          {/* Brand Box */}
          <Card variant="glass" className="p-8 sm:p-10 border-border/80 flex flex-col justify-between">
            <div className="space-y-4 mb-8">
              <Badge variant="default" size="sm">
                For Brands & Agencies
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-bold text-text-primary font-display">
                Find the exact creative partner for your next campaign.
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Turn your project vision into structured briefs in seconds and discover vetted talent with matching portfolio evidence.
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> AI-assisted campaign brief builder
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> Deep visual search across mediums & styles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" /> Clear deliverables, revisions, and terms
                </li>
              </ul>
            </div>
            <Link to="/signup?role=brand">
              <Button variant="secondary" size="md" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Hire Creative Talent
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          FINAL CALL TO ACTION
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-14 lg:p-16 bg-surface-elevated border border-accent/30 overflow-hidden shadow-card-dark text-center">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary font-display tracking-tight">
              Ready to create something extraordinary?
            </h2>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed">
              Join Kampus.VC today and experience the future of AI-powered creative collaboration.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/signup">
                <Button variant="glow" size="lg" className="w-full sm:w-auto px-8" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Get Started for Free
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8">
                  Browse Creators
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
