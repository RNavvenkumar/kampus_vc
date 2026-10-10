import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Github, Twitter, Shield, Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/80 bg-surface/50 text-text-secondary pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 lg:gap-12 pb-12 border-b border-border/60">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xl font-bold tracking-tight text-text-primary font-display">
                Kampus<span className="text-accent">.VC</span>
              </span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              The AI-powered marketplace and collaborative studio for premier digital creators, AI artists, 3D animators, and visionary brands.
            </p>
            <div className="flex items-center gap-3 pt-2 text-text-muted">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-elevated hover:text-accent border border-border transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-surface-elevated hover:text-accent border border-border transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* For Creators */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary font-mono">
              For Creators
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/explore" className="hover:text-accent transition-colors flex items-center gap-1">
                  Creative DNA Passport
                </Link>
              </li>
              <li>
                <Link to="/signup?role=creator" className="hover:text-accent transition-colors">
                  Showcase Portfolio
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-accent transition-colors">
                  Creator Economics
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-accent transition-colors">
                  Project Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* For Brands */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary font-mono">
              For Brands
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/brands" className="hover:text-accent transition-colors">
                  AI Campaign Briefs
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-accent transition-colors">
                  Explainable Matching
                </Link>
              </li>
              <li>
                <Link to="/brands" className="hover:text-accent transition-colors">
                  Verified Creator Talent
                </Link>
              </li>
              <li>
                <Link to="/signup?role=brand" className="hover:text-accent transition-colors">
                  Post a Project
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary font-mono">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/how-it-works" className="hover:text-accent transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <span className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">Terms & Licensing</span>
              </li>
              <li>
                <span className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">Privacy Policy</span>
              </li>
              <li>
                <span className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">System Status</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} Kampus.VC. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-accent">
              <Shield className="w-3.5 h-3.5" /> Secure Platform
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-text-muted" /> Production Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
