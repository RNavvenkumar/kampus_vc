import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CampaignBrief, BriefStatus, BudgetType, EngagementType, LocationPreference, ExperienceRequirement } from '../../types';
import {
  createBrandBrief,
  getBrandBriefById,
  updateBrandBrief,
  publishBrandBrief,
  extractErrorMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  Sparkles,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send,
  Save
} from 'lucide-react';

const CATEGORIES = [
  'Commercial AI Video & Film',
  '3D Motion & Product Visuals',
  'Visual Identity & AI Branding',
  'Generative Concept Art',
  'AI Fashion & Editorial',
  'Game Asset Production',
  'Music Video & Audio-Visual',
  'General Creative Collaboration'
];

const SPECIALTY_OPTIONS = [
  'Runway Gen-3',
  'Midjourney v6',
  'ComfyUI / Stable Diffusion',
  'Cinema 4D / Redshift',
  'Unreal Engine 5',
  'Houdini VFX',
  'After Effects Motion',
  'Brand Guidelines',
  'Prompt Architecture',
  'Color Grading',
  'Sound Design',
  'Character Concept'
];

export const CampaignBriefEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { briefId } = useParams<{ briefId: string }>();
  const isEditing = Boolean(briefId);

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [toolsInput, setToolsInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceRequirement>('any');

  const [deliverables, setDeliverables] = useState<string[]>(['']);
  const [budgetType, setBudgetType] = useState<BudgetType>('range');
  const [budgetMin, setBudgetMin] = useState<number>(2000);
  const [budgetMax, setBudgetMax] = useState<number>(5000);
  const [currency, setCurrency] = useState('USD');
  const [durationWeeks, setDurationWeeks] = useState<number>(4);

  const [targetStartDate, setTargetStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [engagementType, setEngagementType] = useState<EngagementType>('milestone');
  const [locationPreference, setLocationPreference] = useState<LocationPreference>('remote');
  const [refUrlsInput, setRefUrlsInput] = useState('');

  const [status, setStatus] = useState<BriefStatus>('draft');

  // Multi-section step tracker
  const [activeStep, setActiveStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && briefId) {
      const fetchBrief = async () => {
        try {
          setInitialLoading(true);
          const brief = await getBrandBriefById(briefId);
          setTitle(brief.title || '');
          setSummary(brief.summary || '');
          setDescription(brief.description || '');
          setCategory(brief.category || CATEGORIES[0]);
          setSelectedSpecialties(brief.requiredSpecialties || []);
          setToolsInput(brief.creativeTools ? brief.creativeTools.join(', ') : '');
          setExperienceLevel(brief.experienceLevel || 'any');
          setDeliverables(brief.deliverables?.length ? brief.deliverables : ['']);
          setBudgetType(brief.budgetType || 'range');
          setBudgetMin(brief.budgetMin ?? 2000);
          setBudgetMax(brief.budgetMax ?? 5000);
          setCurrency(brief.currency || 'USD');
          setDurationWeeks(brief.durationWeeks ?? 4);
          setTargetStartDate(brief.targetStartDate ? brief.targetStartDate.substring(0, 10) : '');
          setDeadline(brief.deadline ? brief.deadline.substring(0, 10) : '');
          setEngagementType(brief.engagementType || 'milestone');
          setLocationPreference(brief.locationPreference || 'remote');
          setRefUrlsInput(brief.referenceUrls ? brief.referenceUrls.join(', ') : '');
          setStatus(brief.status || 'draft');
        } catch (err) {
          setError(extractErrorMessage(err, 'Failed to load brief'));
        } finally {
          setInitialLoading(false);
        }
      };
      fetchBrief();
    }
  }, [isEditing, briefId]);

  const toggleSpecialty = (spec: string) => {
    if (selectedSpecialties.includes(spec)) {
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== spec));
    } else {
      setSelectedSpecialties([...selectedSpecialties, spec]);
    }
  };

  const handleAddDeliverable = () => {
    setDeliverables([...deliverables, '']);
  };

  const handleRemoveDeliverable = (index: number) => {
    if (deliverables.length === 1) return;
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleDeliverableChange = (index: number, val: string) => {
    const updated = [...deliverables];
    updated[index] = val;
    setDeliverables(updated);
  };

  const buildPayload = (): Partial<CampaignBrief> => {
    const creativeTools = toolsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const referenceUrls = refUrlsInput
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

    const cleanedDeliverables = deliverables
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    return {
      title: title.trim(),
      summary: summary.trim(),
      description: description.trim(),
      category,
      requiredSpecialties: selectedSpecialties,
      creativeTools,
      deliverables: cleanedDeliverables,
      budgetType,
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      currency: currency.toUpperCase(),
      durationWeeks: Number(durationWeeks),
      targetStartDate: targetStartDate || undefined,
      deadline: deadline || undefined,
      engagementType,
      locationPreference,
      experienceLevel,
      referenceUrls
    };
  };

  const handleSaveDraft = async () => {
    setError(null);
    if (!title.trim()) {
      setError('A campaign title is required to save a draft.');
      return;
    }

    try {
      setLoading(true);
      const payload = buildPayload();
      let savedBrief: CampaignBrief;

      if (isEditing && briefId) {
        savedBrief = await updateBrandBrief(briefId, payload);
        setSuccessMessage('Campaign brief draft updated.');
      } else {
        savedBrief = await createBrandBrief(payload);
        setSuccessMessage('Campaign brief created in draft mode.');
        navigate(`/brand/briefs/${savedBrief.id}/edit`, { replace: true });
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save brief'));
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setError(null);

    // Validation checks for publishing
    if (!title.trim() || title.trim().length < 3) {
      setError('Please provide a campaign title (min 3 chars).');
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError('Please provide a comprehensive project description (min 20 chars).');
      return;
    }
    const cleanedDeliverables = deliverables.map((d) => d.trim()).filter((d) => d.length > 0);
    if (cleanedDeliverables.length === 0) {
      setError('Please add at least one project deliverable before publishing.');
      return;
    }
    if (budgetMin > budgetMax) {
      setError('Minimum budget cannot exceed maximum budget.');
      return;
    }

    try {
      setLoading(true);
      const payload = buildPayload();
      let activeId = briefId;

      if (isEditing && briefId) {
        await updateBrandBrief(briefId, payload);
      } else {
        const created = await createBrandBrief(payload);
        activeId = created.id;
      }

      if (activeId) {
        await publishBrandBrief(activeId);
        setSuccessMessage('🎉 Campaign brief published successfully to the creator marketplace!');
        setTimeout(() => {
          navigate('/brand/briefs');
        }, 1500);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to publish campaign brief'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 animate-pulse">
        <div className="h-8 bg-surface-muted rounded w-1/3 mx-auto" />
        <div className="h-4 bg-surface-muted rounded w-1/2 mx-auto" />
        <div className="h-96 bg-surface-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/brand/briefs" className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> All Campaign Briefs
            </Link>
            <span className="text-text-muted">/</span>
            <Badge variant="cyan" size="sm">
              {isEditing ? 'Edit Brief' : 'Brief Creator'}
            </Badge>
            {status && (
              <Badge
                variant={
                  status === 'published'
                    ? 'success'
                    : status === 'paused'
                    ? 'warning'
                    : 'default'
                }
                size="sm"
              >
                {status.toUpperCase()}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            {isEditing ? 'Edit Campaign Brief' : 'Create Campaign Brief'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Specify your creative vision, deliverables, budget parameters, and AI specialty requirements.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={handleSaveDraft}
            isLoading={loading}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Send className="w-4 h-4" />}
            onClick={handlePublish}
            isLoading={loading}
          >
            Publish Brief
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/40 text-status-success text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/40 text-status-error text-sm flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section Step Navigator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { step: 1, label: '1. Overview', icon: FileText },
          { step: 2, label: '2. Creative Skills', icon: Sparkles },
          { step: 3, label: '3. Budget & Scope', icon: DollarSign },
          { step: 4, label: '4. Timeline & Terms', icon: Calendar }
        ].map(({ step, label, icon: Icon }) => (
          <button
            key={step}
            type="button"
            onClick={() => setActiveStep(step)}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${
              activeStep === step
                ? 'bg-accent text-background-dark font-bold border-accent shadow-lg shadow-accent/10'
                : 'bg-surface-elevated text-text-secondary border-border hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: Overview */}
      {activeStep === 1 && (
        <Card variant="glass" className="p-6 sm:p-8 border-border space-y-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> Campaign Overview
          </h2>

          <div className="space-y-4">
            <Input
              label="Campaign Title *"
              placeholder="e.g. Next-Gen Cybernetic Footwear 3D Launch Trailer"
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              helperText="Clear, punchy title that states your product and creative need"
              required
            />

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Campaign Category *
              </label>
              <select
                value={category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Elevator Summary (1-2 sentences)"
              placeholder="Short teaser shown on marketplace search cards..."
              value={summary}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
              maxLength={300}
            />

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Full Creative Brief & Narrative Description *
              </label>
              <textarea
                rows={6}
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Explain the background of your brand, target audience, aesthetic benchmarks, mood, lighting, storytelling arc, and brand constraints..."
                className="w-full bg-surface-elevated border border-border rounded-lg p-3.5 text-sm text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border/60">
            <Button variant="primary" size="md" onClick={() => setActiveStep(2)}>
              Next: Creative Skills →
            </Button>
          </div>
        </Card>
      )}

      {/* SECTION 2: Creative Requirements */}
      {activeStep === 2 && (
        <Card variant="glass" className="p-6 sm:p-8 border-border space-y-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Creative Requirements & Skills
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-2">
                Required AI & Visual Specialties
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_OPTIONS.map((spec) => {
                  const isSelected = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-accent text-background-dark font-bold border-accent'
                          : 'bg-surface-elevated text-text-secondary border-border hover:text-text-primary'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{spec}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              label="Specific Software / AI Tools"
              placeholder="e.g. Runway Gen-3, Midjourney v6, Cinema 4D, Octane"
              value={toolsInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setToolsInput(e.target.value)}
              helperText="Comma-separated tools you prefer the creator to use"
            />

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Creator Experience Requirement
              </label>
              <select
                value={experienceLevel}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setExperienceLevel(e.target.value as ExperienceRequirement)}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="any">Any Experience Level (Portfolio Quality First)</option>
                <option value="intermediate">Intermediate (Proven portfolio with 3+ projects)</option>
                <option value="advanced">Advanced (High-tier commercial experience)</option>
                <option value="expert">Expert / Studio Level</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border/60">
            <Button variant="secondary" size="md" onClick={() => setActiveStep(1)}>
              ← Back: Overview
            </Button>
            <Button variant="primary" size="md" onClick={() => setActiveStep(3)}>
              Next: Budget & Scope →
            </Button>
          </div>
        </Card>
      )}

      {/* SECTION 3: Budget & Deliverables */}
      {activeStep === 3 && (
        <Card variant="glass" className="p-6 sm:p-8 border-border space-y-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" /> Deliverables & Compensation
          </h2>

          <div className="space-y-6">
            {/* Deliverables List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-secondary uppercase font-mono">
                  Key Deliverables Checklist *
                </label>
                <button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Deliverable Item
                </button>
              </div>

              <div className="space-y-2">
                {deliverables.map((deliv, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Deliverable #${idx + 1} (e.g. 1x 60s 4K Video Master, 3x 9:16 Social Cutdowns)`}
                      value={deliv}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleDeliverableChange(idx, e.target.value)}
                      className="flex-1"
                    />
                    {deliverables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(idx)}
                        className="p-2 text-text-muted hover:text-status-error transition-colors rounded-lg hover:bg-surface-elevated"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                  Budget Structure
                </label>
                <select
                  value={budgetType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setBudgetType(e.target.value as BudgetType)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="range">Range (Min - Max)</option>
                  <option value="fixed">Fixed Budget</option>
                </select>
              </div>

              <Input
                label={`Min Budget (${currency}) *`}
                type="number"
                min={0}
                value={budgetMin}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBudgetMin(Number(e.target.value))}
                required
              />

              <Input
                label={`Max Budget (${currency}) *`}
                type="number"
                min={0}
                value={budgetMax}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBudgetMax(Number(e.target.value))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Currency"
                value={currency}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrency(e.target.value)}
                maxLength={3}
                helperText="ISO-4217 Currency Code (e.g. USD, EUR, GBP)"
              />
              <Input
                label="Estimated Duration (Weeks)"
                type="number"
                min={1}
                max={52}
                value={durationWeeks}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDurationWeeks(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border/60">
            <Button variant="secondary" size="md" onClick={() => setActiveStep(2)}>
              ← Back: Skills
            </Button>
            <Button variant="primary" size="md" onClick={() => setActiveStep(4)}>
              Next: Timeline & Terms →
            </Button>
          </div>
        </Card>
      )}

      {/* SECTION 4: Timeline & Location & References */}
      {activeStep === 4 && (
        <Card variant="glass" className="p-6 sm:p-8 border-border space-y-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" /> Timeline, Location & Reference Links
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Target Start Date"
                type="date"
                value={targetStartDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTargetStartDate(e.target.value)}
              />
              <Input
                label="Campaign Deadline"
                type="date"
                value={deadline}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDeadline(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                  Engagement Model
                </label>
                <select
                  value={engagementType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setEngagementType(e.target.value as EngagementType)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="milestone">Milestone-Based Project</option>
                  <option value="one_off">One-Off Deliverable</option>
                  <option value="retainer">Monthly Retainer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                  Location Preference
                </label>
                <select
                  value={locationPreference}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setLocationPreference(e.target.value as LocationPreference)}
                  className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  <option value="remote">100% Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite Production</option>
                </select>
              </div>
            </div>

            <Input
              label="Visual Reference URLs / Moodboards"
              placeholder="https://pinterest.com/..., https://arena.na/..., https://youtube.com/..."
              value={refUrlsInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setRefUrlsInput(e.target.value)}
              helperText="Comma-separated links to aesthetic references"
            />
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border/60">
            <Button variant="secondary" size="md" onClick={() => setActiveStep(3)}>
              ← Back: Budget
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveDraft}
                isLoading={loading}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Send className="w-4 h-4" />}
                onClick={handlePublish}
                isLoading={loading}
              >
                Publish Brief
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
