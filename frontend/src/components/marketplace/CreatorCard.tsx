import React from 'react';
import { CreatorProfile } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CheckCircle2, Sparkles, ArrowRight, Layers, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CreatorCardProps {
  creator: CreatorProfile;
  featured?: boolean;
}

export const CreatorCard: React.FC<CreatorCardProps> = ({ creator, featured = false }) => {
  const items = creator.portfolioItems || [];
  const primaryPortfolio = items[0];
  const displayTagline = creator.tagline || creator.headline || '';
  const displayHandle = creator.handle || (creator.username ? `@${creator.username}` : '@creator');
  const stylesList = creator.creativeDna?.styles || creator.specialties || [];
  const toolsList = creator.creativeDna?.tools || creator.creativeTools || [];
  const profileLink = `/creators/${creator.username || creator.id}`;

  return (
    <Card
      variant="interactive"
      className={`group flex flex-col h-full overflow-hidden transition-all duration-300 hover:border-accent/40 text-left ${
        featured ? 'ring-1 ring-accent/30 shadow-glow-sm' : ''
      }`}
    >
      {/* Portfolio Thumbnail Preview */}
      <div className="relative h-48 w-full overflow-hidden bg-surface-elevated">
        {primaryPortfolio ? (
          <img
            src={primaryPortfolio.thumbnailUrl || primaryPortfolio.mediaUrl}
            alt={primaryPortfolio.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <Layers className="w-8 h-8 opacity-40" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {creator.isDemonstration && (
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-black/70 text-accent border border-accent/30 backdrop-blur-md">
              DEMO PROFILE
            </span>
          )}
          <Badge
            variant={creator.availability === 'available' ? 'success' : 'warning'}
            size="sm"
            className="backdrop-blur-md bg-surface/80 ml-auto"
          >
            {creator.availability === 'available' ? 'Available for hire' : 'Limited availability'}
          </Badge>
        </div>

        {/* Rate starting pill */}
        {(creator.rateStartingAt || creator.hourlyRate) && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-border text-xs font-semibold text-text-primary">
            From ${creator.rateStartingAt || creator.hourlyRate}
          </div>
        )}
      </div>

      {/* Creator Profile Details */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Avatar & Name */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={creator.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
            alt={creator.displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-border group-hover:border-accent/50 transition-colors"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-text-primary truncate group-hover:text-accent transition-colors">
                {creator.displayName}
              </h3>
              {creator.verifiedStatus === 'featured' && (
                <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
              )}
              {creator.verifiedStatus === 'verified' && (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-text-muted truncate font-mono">{displayHandle}</p>
          </div>
        </div>

        {/* Tagline / Headline */}
        {displayTagline && (
          <p className="text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
            {displayTagline}
          </p>
        )}

        {/* Creative DNA Styles */}
        <div className="mb-4">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 font-mono">
            <Tag className="w-3 h-3 text-accent" /> Style DNA
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stylesList.slice(0, 3).map((style, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-secondary border border-border/80"
              >
                {style}
              </span>
            ))}
          </div>
        </div>

        {/* Tools & CTA */}
        <div className="mt-auto pt-4 border-t border-border/60 flex items-center justify-between">
          <div className="text-xs text-text-muted truncate max-w-[140px]">
            {toolsList.slice(0, 2).join(' • ')}
          </div>
          <Link to={profileLink}>
            <Button variant="ghost" size="sm" className="text-accent hover:text-accent font-semibold p-0 hover:bg-transparent" rightIcon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}>
              View Showcase
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
