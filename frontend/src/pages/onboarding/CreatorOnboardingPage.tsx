import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { saveCreatorOnboardingStep, completeCreatorOnboarding, extractErrorMessage } from '../../services/api';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Palette,
  Layers,
  Sliders,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export const CreatorOnboardingPage: React.FC = () => {
  const { user, creatorProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(user?.onboardingStep || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState(creatorProfile?.displayName || user?.name || '');
  const [username, setUsername] = useState(creatorProfile?.username || '');
  const [headline, setHeadline] = useState(creatorProfile?.headline || '');

  const [biography, setBiography] = useState(creatorProfile?.biography || '');
  const [specialties, setSpecialties] = useState<string[]>(creatorProfile?.specialties || ['AI Concept Art']);
  const [creativeTools, setCreativeTools] = useState<string[]>(creatorProfile?.creativeTools || ['Midjourney']);
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>(
    creatorProfile?.experienceLevel || 'intermediate'
  );

  const [portfolioTitle, setPortfolioTitle] = useState(creatorProfile?.portfolioItems?.[0]?.title || '');
  const [portfolioDesc, setPortfolioDesc] = useState(creatorProfile?.portfolioItems?.[0]?.description || '');
  const [portfolioMediaUrl, setPortfolioMediaUrl] = useState(
    creatorProfile?.portfolioItems?.[0]?.mediaUrl || ''
  );
  const [portfolioCategory, setPortfolioCategory] = useState(
    creatorProfile?.portfolioItems?.[0]?.category || 'Generative AI'
  );

  const [hourlyRate, setHourlyRate] = useState<number | undefined>(creatorProfile?.hourlyRate || 85);
  const [availability, setAvailability] = useState<'available' | 'limited' | 'busy'>(
    creatorProfile?.availability || 'available'
  );
  const [location, setLocation] = useState(creatorProfile?.location || 'Remote / Worldwide');
  const [website, setWebsite] = useState(creatorProfile?.website || '');

  useEffect(() => {
    if (user?.onboardingStep && user.onboardingStep > 1 && user.onboardingStep <= 5) {
      setCurrentStep(user.onboardingStep);
    }
  }, [user?.onboardingStep]);

  const availableSpecialties = [
    'AI Concept Art',
    '3D Motion',
    'Procedural VFX',
    'Generative Video',
    'Brand Identity',
    'Sound Design',
    'Digital Matte Painting',
    'Character Design'
  ];

  const availableTools = [
    'Midjourney',
    'Stable Diffusion',
    'ComfyUI',
    'Cinema 4D',
    'Houdini',
    'Blender',
    'Runway Gen-3',
    'Photoshop',
    'Figma',
    'DaVinci Resolve'
  ];

  const toggleSpecialty = (item: string) => {
    setSpecialties((prev) => (prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]));
  };

  const toggleTool = (item: string) => {
    setCreativeTools((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };

  const handleNextStep = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let stepPayload: Record<string, unknown> = {};

      if (currentStep === 1) {
        stepPayload = { displayName, username: username || undefined, headline };
      } else if (currentStep === 2) {
        stepPayload = { biography, specialties, creativeTools, experienceLevel };
      } else if (currentStep === 3) {
        if (portfolioTitle && portfolioMediaUrl) {
          stepPayload = {
            portfolioItems: [
              {
                title: portfolioTitle,
                description: portfolioDesc,
                category: portfolioCategory,
                mediaUrl: portfolioMediaUrl,
                tags: specialties
              }
            ]
          };
        }
      } else if (currentStep === 4) {
        stepPayload = {
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          availability,
          location,
          website: website || undefined
        };
      }

      await saveCreatorOnboardingStep(currentStep, stepPayload);
      setCurrentStep((prev) => prev + 1);
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to save onboarding progress.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await completeCreatorOnboarding();
      await refreshUser();
      navigate('/creator/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to complete creator onboarding.'));
    } finally {
      setIsLoading(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Identity', icon: <User className="w-4 h-4" /> },
    { num: 2, label: 'Creative DNA', icon: <Palette className="w-4 h-4" /> },
    { num: 3, label: 'Portfolio', icon: <Layers className="w-4 h-4" /> },
    { num: 4, label: 'Preferences', icon: <Sliders className="w-4 h-4" /> },
    { num: 5, label: 'Review', icon: <FileCheck2 className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Wizard Header */}
      <div className="text-center space-y-2">
        <Badge variant="cyan" size="md">
          Creator Onboarding Wizard
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
          Craft Your Creator Profile
        </h1>
        <p className="text-sm text-text-secondary">
          Step {currentStep} of 5 — Your progress is saved automatically to MongoDB.
        </p>
      </div>

      {/* Progress Step Bar */}
      <div className="grid grid-cols-5 gap-2 pb-4">
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
        {/* Step 1: Identity */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 1: Basic Identity</h3>
              <p className="text-xs text-text-secondary mt-1">
                Set up your public persona and memorable headline.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Unique Username / Slug
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  placeholder="e.g. elenavance_ai"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Professional Headline *
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Generative AI Director & Cinematic World Builder"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Creative Identity */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 2: Creative DNA & Specialties</h3>
              <p className="text-xs text-text-secondary mt-1">
                Tell clients about your aesthetic strengths and preferred tools.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase font-mono">
                  Primary Specialties
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableSpecialties.map((item) => {
                    const isSelected = specialties.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => toggleSpecialty(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface-elevated border-border text-text-secondary hover:border-border/80'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase font-mono">
                  Creative Software & AI Tools
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTools.map((item) => {
                    const isSelected = creativeTools.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => toggleTool(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-accent/15 border-accent text-accent'
                            : 'bg-surface-elevated border-border text-text-secondary hover:border-border/80'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase font-mono">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="beginner">Beginner (1-2 years)</option>
                  <option value="intermediate">Intermediate (3-5 years)</option>
                  <option value="advanced">Advanced (5-8 years)</option>
                  <option value="expert">Expert / Veteran Director (8+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Artist Biography
                </label>
                <textarea
                  rows={4}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Share your creative background, notable campaigns, or unique visual philosophies..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Portfolio */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 3: Feature Your First Work</h3>
              <p className="text-xs text-text-secondary mt-1">
                Add an external link (Unsplash, ArtStation, YouTube, Vimeo, or CDN URL) showcasing your best work.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    placeholder="e.g. Neo-Tokyo Solitude Concept"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Category
                  </label>
                  <select
                    value={portfolioCategory}
                    onChange={(e) => setPortfolioCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="Generative AI">Generative AI Art</option>
                    <option value="3D Motion">3D Motion & VFX</option>
                    <option value="Video & Film">Video & Synthetic Film</option>
                    <option value="Brand Identity">Brand & Visual Identity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Media Image / Video URL
                </label>
                <input
                  type="url"
                  value={portfolioMediaUrl}
                  onChange={(e) => setPortfolioMediaUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Project Description
                </label>
                <textarea
                  rows={2}
                  value={portfolioDesc}
                  onChange={(e) => setPortfolioDesc(e.target.value)}
                  placeholder="Briefly explain the techniques and tools used..."
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Professional Preferences */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 4: Rates & Availability</h3>
              <p className="text-xs text-text-secondary mt-1">
                Help brands understand your rate expectations and current bandwidth.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Starting Hourly Rate (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hourlyRate || ''}
                    onChange={(e) => setHourlyRate(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 100"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Availability Status
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="available">Available for Work</option>
                    <option value="limited">Limited Bandwidth</option>
                    <option value="busy">Fully Booked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Location / Timezone
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. London, UK (UTC+0)"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                  Personal Website / Portfolio Link
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://myportfolio.art"
                  className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Complete */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-text-primary">Step 5: Review & Publish</h3>
              <p className="text-xs text-text-secondary mt-1">
                Confirm your details before activating your creator dashboard.
              </p>
            </div>

            <div className="space-y-4 p-6 rounded-xl bg-surface-elevated/70 border border-border/80 text-sm">
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Display Name:</span>
                <span className="font-semibold text-text-primary">{displayName}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Headline:</span>
                <span className="font-semibold text-text-primary text-right max-w-sm">{headline}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Specialties:</span>
                <span className="font-semibold text-accent">{specialties.join(', ') || 'None selected'}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-3">
                <span className="text-text-muted">Tools:</span>
                <span className="font-semibold text-text-primary">{creativeTools.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Starting Rate:</span>
                <span className="font-semibold text-text-primary">${hourlyRate}/hr</span>
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

          {currentStep < 5 ? (
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
