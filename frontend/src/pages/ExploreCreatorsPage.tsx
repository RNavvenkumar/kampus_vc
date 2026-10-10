import React, { useState, useMemo } from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { CreatorCard } from '../components/marketplace/CreatorCard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DEMO_CREATORS } from '../services/api';
import { Search, Info, X } from 'lucide-react';

export const ExploreCreatorsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('All');

  const specialties = ['All', 'AI Concept Art', '3D Motion', 'Brand Identity', 'AI Video Generation', 'Procedural Simulation'];

  const filteredCreators = useMemo(() => {
    return DEMO_CREATORS.filter((creator) => {
      const taglineOrHeadline = creator.tagline || creator.headline || '';
      const styles = creator.creativeDna?.styles || creator.specialties || [];
      const tools = creator.creativeDna?.tools || creator.creativeTools || [];

      const matchesSearch =
        searchTerm === '' ||
        creator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        taglineOrHeadline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        styles.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tools.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSpecialty =
        selectedSpecialty === 'All' || creator.specialties.includes(selectedSpecialty);

      const matchesAvailability =
        selectedAvailability === 'All' || creator.availability === selectedAvailability;

      return matchesSearch && matchesSpecialty && matchesAvailability;
    });
  }, [searchTerm, selectedSpecialty, selectedAvailability]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Page Header */}
      <SectionHeader
        pillText="Marketplace Discovery"
        title="Explore Creative Talent"
        subtitle="Search and filter creators across AI imagery, 3D motion design, synthetic cinema, and visual identity."
        align="center"
      />

      {/* Demonstration Notice */}
      <div className="p-4 rounded-xl bg-surface-elevated border border-accent/30 text-xs text-text-secondary flex items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-accent flex-shrink-0" />
          <span>
            <strong>Curated Showcase:</strong> Verified top creator profiles showcasing synthetic cinema, generative 3D, and AI creative direction.
          </span>
        </div>
        <Badge variant="cyan" size="sm">
          Verified Creators
        </Badge>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="glass" className="p-6 max-w-5xl mx-auto border-border/80">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by artist, style (e.g. Cyberpunk), or tool (e.g. Houdini)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Specialty Dropdown */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              {specialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>

            {/* Availability Filter */}
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="All">Any Availability</option>
              <option value="available">Available Now</option>
              <option value="limited">Limited</option>
              <option value="busy">Busy</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Creator Grid */}
      {filteredCreators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {filteredCreators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Creators Found"
          description="Try adjusting your search query or selecting a different specialty filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setSelectedSpecialty('All');
            setSelectedAvailability('All');
          }}
        />
      )}
    </div>
  );
};
