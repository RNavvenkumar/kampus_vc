import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Cpu, Palette, Sliders, ShieldCheck } from 'lucide-react';

export const CreativeDnaPreview: React.FC = () => {
  return (
    <Card variant="glass" className="p-6 sm:p-8 max-w-xl mx-auto border-accent/30 shadow-glow-sm">
      <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
              Creative DNA Passport™
            </h4>
            <p className="text-xs text-text-muted">Structured Aesthetic & Technical Profile</p>
          </div>
        </div>
        <Badge variant="cyan" size="sm">
          Verified Model
        </Badge>
      </div>

      <div className="space-y-4 text-sm">
        {/* Mediums */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2 uppercase font-mono">
            <Sliders className="w-3.5 h-3.5 text-accent" /> Core Mediums
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-md bg-surface-elevated text-xs text-text-primary border border-border">
              3D Kinetic Typography
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-elevated text-xs text-text-primary border border-border">
              Generative AI Matte Painting
            </span>
            <span className="px-2.5 py-1 rounded-md bg-surface-elevated text-xs text-text-primary border border-border">
              Procedural Houdini VFX
            </span>
          </div>
        </div>

        {/* Visual Signatures */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2 uppercase font-mono">
            <Palette className="w-3.5 h-3.5 text-accent" /> Visual Signatures
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-surface-elevated/80 border border-border/60">
              <span className="text-text-muted block text-[10px] uppercase font-mono">Lighting</span>
              <span className="font-semibold text-text-primary">Atmospheric Volumetrics</span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-elevated/80 border border-border/60">
              <span className="text-text-muted block text-[10px] uppercase font-mono">Palette</span>
              <span className="font-semibold text-text-primary">Cyber-Noir & Acid Accents</span>
            </div>
          </div>
        </div>

        {/* Explainability Trust Note */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center gap-1 text-accent">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Creator Controlled & Verified
          </span>
          <span>Updated Oct 2026</span>
        </div>
      </div>
    </Card>
  );
};
