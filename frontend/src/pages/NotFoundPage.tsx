import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Card variant="glass" className="w-full max-w-md p-8 sm:p-10 border-border text-center shadow-card-dark">
        <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
          <Compass className="w-7 h-7 text-accent" />
        </div>

        <span className="text-4xl font-extrabold text-accent font-mono block mb-2">404</span>

        <h2 className="text-2xl font-bold text-text-primary font-display mb-3">
          Page Not Found
        </h2>

        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          The creative pathway you're looking for doesn't exist or has been relocated.
        </p>

        <Link to="/">
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Return to Homepage
          </Button>
        </Link>
      </Card>
    </div>
  );
};
