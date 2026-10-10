import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { saveBrandOnboardingStep, completeBrandOnboarding, extractErrorMessage } from '../../services/api';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building,
  FileText,
  UserCheck,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export const BrandOnboardingPage: React.FC = () => {
  const { user, brandProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(user?.onboardingStep || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState(brandProfile?.companyName || user?.name || '');
  const [industry, setIndustry] = useState(brandProfile?.industry || 'Digital Media & Marketing');
  const [companySize, setCompanySize] = useState<'1-10' | '11-50' | '51-200' | '201-1000' | '1000+'>(
    (brandProfile?.companySize as any) || '11-50'
  );

  const [description, setDescription] = useState(brandProfile?.description || '');
  const [website, setWebsite] = useState(brandProfile?.website || '');
  const [location, setLocation] = useState(brandProfile?.location || 'New York, USA');

  const [contactName, setContactName] = useState(brandProfile?.contactName || user?.name || '');
  const [contactRole, setContactRole] = useState(brandProfile?.contactRole || 'Creative Director / Brand Lead');

  useEffect(() => {
    if (user?.onboardingStep && user.onboardingStep > 1 && user.onboardingStep <= 4) {
      setCurrentStep(user.onboardingStep);
    }
  }, [user?.onboardingStep]);

  const industries = [
    'Digital Media & Marketing',
    'Gaming & Entertainment',
    'Fashion & Luxury',
    'Tech & SaaS Unicorns',
    'E-Commerce & DTC',
    'Creative & Ad Agency',
    'Film & Music Production'
  ];

  const handleNextStep = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let stepPayload: Record<string, unknown> = {};

      if (currentStep === 1) {
        stepPayload = { companyName, industry, companySize };
      } else if (currentStep === 2) {
        stepPayload = { description, website: website || undefined, location };
      } else if (currentStep === 3) {
        stepPayload = { contactName, contactRole };
      }

      await saveBrandOnboardingStep(currentStep, stepPayload);
      setCurrentStep((prev) => prev + 1);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save onboarding step.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await completeBrandOnboarding();
      await refreshUser();
      navigate('/brand/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to complete brand onboarding.'));
    } finally {
      setIsLoading(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Company', icon: <Building className="w-4 h-4" /> },
    { num: 2, label: 'Details', icon: <FileText className="w-4 h-4" /> },
    { num: 3, label: 'Contact', icon: <UserCheck className="w-4 h-4" /> },
    { num: 4, label: 'Review', icon: <FileCheck2 className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      {/* Wizard Header */}
      <div className="text-center space-y-2">
        <Badge variant="cyan" size="md">
          Brand Onboarding Wizard
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
          Set Up Your Brand Profile
        </h1>
        <p className="text-sm text-text-secondary">
          Step {currentStep} of 4 — Persisted directly to your database.
        </p>
      </div>

      {/* Progress Step Bar */}
      <div className="grid grid-cols-4 gap-2 pb-4">
        {stepsList.map((step) => {
          const isDone = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          return (
            <div
              key={step.num}
              className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition-all ${
                isCurrent
                  ? 'bg-surface-elevated border-accent text-accent shadow-glow-sm'
                  : isDone
                  ? 'bg-surface/80 border-success/40 text-success'
                  : 'bg-surface/40 border-border/60 text-text-muted opacity-60'
              }`}
            >
              <div className="flex items-center gap-1">
                {isDone ? <CheckCircle2 className="w-4 h-4 text-success" /> : step.icon}
                <span className="text-xs font-bold font-mono">0{step.num}</span>
              </div>
              <span className="text-[11px] font-medium hidden sm:inline">{step.label}</span>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Contents */}
      <Card variant="glass" className="p-8 sm:p-10 border-border/80 shadow-card-dark">
        {/* Step 1: Company Identity */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 1: Company Identity</h3>
              <p className="text-xs text-text-secondary mt-1">
                Tell us about your organization or agency.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Company / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Creative Studios"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Industry Sector *
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Company Size
                </label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="1-10">1 - 10 employees (Boutique / Startup)</option>
                  <option value="11-50">11 - 50 employees (Growing Agency / Studio)</option>
                  <option value="51-200">51 - 200 employees (Mid-Sized Enterprise)</option>
                  <option value="201-1000">201 - 1,000 employees</option>
                  <option value="1000+">1,000+ employees (Global Enterprise)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Company Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 2: Company Details</h3>
              <p className="text-xs text-text-secondary mt-1">
                Provide public links and descriptions for creators to learn about your brand.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://acmestudios.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Company Overview
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your brand focus, creative vision, and typical campaign requirements..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Headquarters / Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact Person */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 3: Primary Contact</h3>
              <p className="text-xs text-text-secondary mt-1">
                Identify the primary point of contact for project communications.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Role / Title within Organization
                </label>
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="e.g. VP of Creative / Campaign Producer"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Complete */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 4: Review & Finalize</h3>
              <p className="text-xs text-text-secondary mt-1">
                Review your company details before entering your campaign manager.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-xl bg-surface-elevated/70 border border-border/80 text-sm">
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Company Name:</span>
                <span className="font-semibold text-text-primary">{companyName}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Industry:</span>
                <span className="font-semibold text-accent">{industry}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Company Size:</span>
                <span className="font-semibold text-text-primary">{companySize} employees</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Primary Contact:</span>
                <span className="font-semibold text-text-primary">{contactName} ({contactRole})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Website:</span>
                <span className="font-semibold text-text-primary">{website || 'Not provided'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-between gap-4">
          {currentStep > 1 ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCurrentStep((p) => p - 1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Previous Step
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNextStep}
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Save & Continue
            </Button>
          ) : (
            <Button
              variant="glow"
              size="lg"
              onClick={handleComplete}
              isLoading={isLoading}
              rightIcon={<Sparkles className="w-4 h-4" />}
            >
              Complete Onboarding
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
