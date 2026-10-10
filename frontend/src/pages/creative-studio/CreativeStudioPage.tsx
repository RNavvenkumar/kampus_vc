import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Sparkles,
  Wand2,
  Compass,
  Palette,
  Layers,
  Save,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Split,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  getAIStatus,
  generateAIBrief,
  generateAIDirections,
  analyzeAIMoodboard,
  synthesizeAIRequirements,
  improveAIDraft,
  getCreativeDrafts,
  getCreativeDraftById,
  saveCreativeDraft,
  updateCreativeDraft,
  deleteCreativeDraft,
  convertCreativeDraftToCampaignBrief,
  extractErrorMessage
} from '../../services/api';
import {
  AIProviderStatus,
  AIUsageMetrics,
  GeneratedBrief,
  CreativeDirection,
  MoodboardAnalysis,
  RequirementSynthesis,
  DraftImprovement,
  CreativeBriefDraft
} from '../../types';

export const CreativeStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { draftId } = useParams<{ draftId?: string }>();

  // AI Provider state
  const [providerStatus, setProviderStatus] = useState<AIProviderStatus | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'generate' | 'directions' | 'moodboard' | 'requirements' | 'improver' | 'saved'>('generate');

  // Input State for Brief Generation
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('3D Animation & Motion');
  const [knownBudgetMin, setKnownBudgetMin] = useState<number | undefined>(3000);
  const [knownBudgetMax, setKnownBudgetMax] = useState<number | undefined>(7500);
  const [currency, setCurrency] = useState('USD');
  const [timelineWeeks, setTimelineWeeks] = useState<number | undefined>(4);
  const [locationPreference] = useState<'remote' | 'hybrid' | 'onsite'>('remote');

  // Active Creative Draft Data
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const [draftTitle, setDraftTitle] = useState('Untitled AI Creative Campaign');
  const [structuredBrief, setStructuredBrief] = useState<GeneratedBrief | null>(null);
  const [creativeDirections, setCreativeDirections] = useState<CreativeDirection[]>([]);
  const [selectedDirectionIdx, setSelectedDirectionIdx] = useState(0);
  const [moodboardUrls, setMoodboardUrls] = useState<string[]>([]);
  const [newMoodboardUrl, setNewMoodboardUrl] = useState('');
  const [moodboardAnalysis, setMoodboardAnalysis] = useState<MoodboardAnalysis | null>(null);
  const [synthesizedRequirements, setSynthesizedRequirements] = useState<RequirementSynthesis | null>(null);
  const [latestUsage, setLatestUsage] = useState<AIUsageMetrics | null>(null);

  // Field Improver State
  const [improverField, setImproverField] = useState<string>('summary');
  const [improverGoal, setImproverGoal] = useState<string>('improve_clarity');
  const [improverResult, setImproverResult] = useState<DraftImprovement | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Saved Drafts List
  const [savedDrafts, setSavedDrafts] = useState<CreativeBriefDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  // Sample prompt presets for quick start
  const promptPresets = [
    {
      label: '3D Cyberpunk Commercial',
      prompt: 'We are launching a high-performance EV coupe for digital creators. We need a 30-second kinetic 3D commercial blending neon cybernetic visuals, holographic interfaces, and volumetric sound design.',
      category: '3D Animation & Motion'
    },
    {
      label: 'Sustainable Luxury Skincare',
      prompt: 'Launch campaign for a botanical luxury skincare line. Need calm, tactile editorial video visuals, macro water droplet textures, and a warm alabaster and subtle sage color aesthetic.',
      category: 'Video Production & Direction'
    },
    {
      label: 'Viral Gen Z TikTok Hooks',
      prompt: 'We need 5 high-energy 15-second vertical TikTok/Reels product videos with animated lower thirds, punchy sound cues, and modern neon gradients for an energy drink brand.',
      category: 'AI Art & Concept Direction'
    }
  ];

  // Fetch AI provider status
  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await getAIStatus();
        setProviderStatus(status);
      } catch (err) {
        setProviderStatus({
          isConfigured: false,
          provider: 'none',
          textModel: 'none',
          visionModel: 'none',
          dailyLimit: 0
        });
      }
    }
    loadStatus();
  }, []);

  // Load existing draft if ID provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  async function loadDraft(id: string) {
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      const draft = await getCreativeDraftById(id);
      setCurrentDraftId(draft.id);
      setDraftTitle(draft.title);
      setPrompt(draft.userPrompt);
      setStructuredBrief(draft.structuredBrief);
      setCreativeDirections(draft.creativeDirections || []);
      setSelectedDirectionIdx(draft.selectedDirectionIndex || 0);
      setMoodboardUrls((draft.moodboardReferences || []).map(r => r.url));
      setMoodboardAnalysis(draft.moodboardAnalysis || null);
      setSynthesizedRequirements(draft.synthesizedRequirements || null);
      if (draft.promptContext) {
        if (draft.promptContext.category) setCategory(draft.promptContext.category);
        if (draft.promptContext.knownBudgetMin) setKnownBudgetMin(draft.promptContext.knownBudgetMin);
        if (draft.promptContext.knownBudgetMax) setKnownBudgetMax(draft.promptContext.knownBudgetMax);
        if (draft.promptContext.currency) setCurrency(draft.promptContext.currency);
        if (draft.promptContext.timelineWeeks) setTimelineWeeks(draft.promptContext.timelineWeeks);
      }
      setSuccessMsg(`Loaded creative draft "${draft.title}"`);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to load creative draft'));
    } finally {
      setIsGenerating(false);
    }
  }

  // Load all saved drafts for drawer
  async function loadSavedDraftsList() {
    try {
      setLoadingDrafts(true);
      const res = await getCreativeDrafts({ limit: 20 });
      setSavedDrafts(res.drafts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrafts(false);
    }
  }

  // Generate Structured Brief
  async function handleGenerateBrief() {
    if (!prompt.trim()) {
      setErrorMsg('Please describe your campaign vision in the prompt field.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const result = await generateAIBrief({
        userPrompt: prompt,
        category,
        knownBudgetMin,
        knownBudgetMax,
        currency,
        timelineWeeks,
        locationPreference
      });

      setStructuredBrief(result.brief);
      setDraftTitle(result.brief.title || 'AI Generated Campaign');
      setLatestUsage(result.usage || null);
      setSuccessMsg('✨ Campaign brief structured and validated successfully!');

      // Automatically generate creative directions as next step
      handleGenerateDirections(result.brief.title, result.brief.objective, result.brief.creativeApproach);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to generate brief. Please check AI provider configuration.'));
    } finally {
      setIsGenerating(false);
    }
  }

  // Generate Creative Directions
  async function handleGenerateDirections(briefTitleOverride?: string, objectiveOverride?: string, approachOverride?: string) {
    const title = briefTitleOverride || structuredBrief?.title || draftTitle;
    const obj = objectiveOverride || structuredBrief?.objective || prompt;
    const approach = approachOverride || structuredBrief?.creativeApproach;

    if (!title || !obj) {
      setErrorMsg('Please generate or provide a brief title and objective first.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);

      const result = await generateAIDirections({
        briefTitle: title,
        objective: obj,
        creativeApproach: approach,
        count: 3
      });

      setCreativeDirections(result.directions);
      setSelectedDirectionIdx(0);
      setLatestUsage(result.usage || null);
      setSuccessMsg('🎨 3 distinct creative directions synthesized with color palettes!');
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to generate creative directions.'));
    } finally {
      setIsGenerating(false);
    }
  }

  // Add Moodboard Reference Image
  function handleAddMoodboardUrl() {
    if (!newMoodboardUrl.trim()) return;
    const trimmed = newMoodboardUrl.trim();

    if (!trimmed.startsWith('https://')) {
      setErrorMsg('Only secure public HTTPS image URLs are permitted for moodboard intelligence.');
      return;
    }

    if (moodboardUrls.includes(trimmed)) {
      setErrorMsg('This URL is already in your moodboard collection.');
      return;
    }

    if (moodboardUrls.length >= 8) {
      setErrorMsg('Maximum 8 moodboard references allowed per campaign session.');
      return;
    }

    setMoodboardUrls([...moodboardUrls, trimmed]);
    setNewMoodboardUrl('');
    setErrorMsg(null);
  }

  function handleRemoveMoodboardUrl(index: number) {
    setMoodboardUrls(moodboardUrls.filter((_, i) => i !== index));
  }

  // Analyze Moodboard
  async function handleAnalyzeMoodboard() {
    if (moodboardUrls.length === 0) {
      setErrorMsg('Please add at least 1 public HTTPS image reference URL to analyze.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);

      const result = await analyzeAIMoodboard({
        imageUrls: moodboardUrls,
        contextNotes: `Campaign: ${draftTitle}. Category: ${category}`
      });

      setMoodboardAnalysis(result.analysis);
      setLatestUsage(result.usage || null);
      setSuccessMsg('🔍 Moodboard visual analysis and palette extraction complete!');
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Moodboard analysis failed. Ensure valid public HTTPS images.'));
    } finally {
      setIsGenerating(false);
    }
  }

  // Synthesize Requirements & Milestones
  async function handleSynthesizeRequirements() {
    if (!structuredBrief) {
      setErrorMsg('Please generate a structured brief first.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);

      const hints = (structuredBrief.deliverables || []).map(d => `${d.quantity}x ${d.name} (${d.format})`);

      const result = await synthesizeAIRequirements({
        briefTitle: structuredBrief.title,
        summary: structuredBrief.summary,
        creativeApproach: structuredBrief.creativeApproach,
        deliverableHints: hints
      });

      setSynthesizedRequirements(result.synthesis);
      setLatestUsage(result.usage || null);
      setSuccessMsg('📋 Deliverables and production milestones synthesized!');
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Requirement synthesis failed.'));
    } finally {
      setIsGenerating(false);
    }
  }

  // Improve Draft Field
  async function handleImproveField() {
    if (!structuredBrief) return;

    let contentToImprove = '';
    if (improverField === 'summary') contentToImprove = structuredBrief.summary;
    else if (improverField === 'objective') contentToImprove = structuredBrief.objective;
    else if (improverField === 'creativeApproach') contentToImprove = structuredBrief.creativeApproach;
    else if (improverField === 'coreMessage') contentToImprove = structuredBrief.coreMessage;
    else if (improverField === 'targetAudience') contentToImprove = structuredBrief.targetAudience;

    if (!contentToImprove) {
      setErrorMsg('The selected field has no content to improve yet.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);

      const result = await improveAIDraft({
        fieldName: improverField,
        currentContent: contentToImprove,
        improvementGoal: improverGoal,
        campaignContext: { category, title: structuredBrief.title }
      });

      setImproverResult(result.improvement);
      setLatestUsage(result.usage || null);
      setSuccessMsg('✨ AI suggestion generated! Review changes below.');
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Field improvement failed.'));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApplyImprovement() {
    if (!improverResult || !structuredBrief) return;

    const updated = { ...structuredBrief };
    if (improverField === 'summary') updated.summary = improverResult.suggestedImprovement;
    else if (improverField === 'objective') updated.objective = improverResult.suggestedImprovement;
    else if (improverField === 'creativeApproach') updated.creativeApproach = improverResult.suggestedImprovement;
    else if (improverField === 'coreMessage') updated.coreMessage = improverResult.suggestedImprovement;
    else if (improverField === 'targetAudience') updated.targetAudience = improverResult.suggestedImprovement;

    setStructuredBrief(updated);
    setImproverResult(null);
    setSuccessMsg(`Applied AI improvement to ${improverField}!`);
  }

  // Save Creative Draft to Database
  async function handleSaveDraft() {
    if (!structuredBrief) {
      setErrorMsg('No brief content available to save. Generate a brief first.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const payload = {
        title: draftTitle || structuredBrief.title,
        userPrompt: prompt || structuredBrief.summary,
        promptContext: {
          category,
          knownBudgetMin,
          knownBudgetMax,
          currency,
          timelineWeeks,
          locationPreference
        },
        structuredBrief,
        creativeDirections,
        selectedDirectionIndex: selectedDirectionIdx,
        moodboardReferences: moodboardUrls.map(url => ({ url })),
        moodboardAnalysis: moodboardAnalysis || undefined,
        synthesizedRequirements: synthesizedRequirements || undefined,
        aiMetadata: latestUsage
          ? {
              provider: latestUsage.provider,
              model: latestUsage.model,
              totalTokens: latestUsage.totalTokens
            }
          : undefined
      };

      if (currentDraftId) {
        const updated = await updateCreativeDraft(currentDraftId, payload);
        setCurrentDraftId(updated.id);
        setSuccessMsg(`Creative draft saved (Version ${updated.version})`);
      } else {
        const created = await saveCreativeDraft(payload);
        setCurrentDraftId(created.id);
        navigate(`/brand/creative-studio/${created.id}`, { replace: true });
        setSuccessMsg('Creative draft saved successfully to your brand workspace!');
      }
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to save creative draft.'));
    } finally {
      setIsSaving(false);
    }
  }

  // Convert Approved Draft to CampaignBrief
  async function handleConvertToCampaignBrief() {
    if (!structuredBrief) {
      setErrorMsg('Please generate and review a structured brief before converting.');
      return;
    }

    try {
      setIsConverting(true);
      setErrorMsg(null);

      // Save draft first if not yet persisted
      let draftIdToConvert = currentDraftId;
      if (!draftIdToConvert) {
        const saved = await saveCreativeDraft({
          title: draftTitle || structuredBrief.title,
          userPrompt: prompt || structuredBrief.summary,
          promptContext: { category, knownBudgetMin, knownBudgetMax, currency, timelineWeeks, locationPreference },
          structuredBrief,
          creativeDirections,
          selectedDirectionIndex: selectedDirectionIdx,
          moodboardReferences: moodboardUrls.map(url => ({ url })),
          moodboardAnalysis: moodboardAnalysis || undefined,
          synthesizedRequirements: synthesizedRequirements || undefined
        });
        draftIdToConvert = saved.id;
        setCurrentDraftId(saved.id);
      }

      const conversion = await convertCreativeDraftToCampaignBrief(draftIdToConvert);
      setSuccessMsg('🎉 Official campaign brief created! Redirecting to campaign editor for final review...');
      setTimeout(() => {
        navigate(`/brand/briefs/${conversion.campaignBriefId}/edit`);
      }, 1200);
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Failed to convert draft to campaign brief.'));
      setIsConverting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 2000);
  }

  return (
    <div className="min-h-screen bg-canvas-default text-text-primary pb-20">
      {/* Top Banner & Header */}
      <div className="border-b border-border-default/40 bg-surface-subtle/40 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shadow-neon-glow">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">AI Creative Brief Studio</h1>
                <Badge variant="cyan" size="sm">Phase 5</Badge>
                {currentDraftId && <Badge variant="neutral" size="sm">Draft ID: {currentDraftId.slice(-6)}</Badge>}
              </div>
              <p className="text-xs text-text-muted">
                Transform visionary ideas into structured campaign briefs, creative directions & moodboard insights.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* AI Provider Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-border-default text-xs">
              {providerStatus?.isConfigured ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium capitalize">{providerStatus.provider} {providerStatus.textModel}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-medium">Provider Offline</span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadSavedDraftsList();
                setActiveTab('saved');
              }}
              leftIcon={<FolderOpen className="w-4 h-4" />}
            >
              Saved Drafts
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || !structuredBrief}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleConvertToCampaignBrief}
              disabled={isConverting || !structuredBrief}
              isLoading={isConverting}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              Convert to Brief
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm flex items-start space-x-3 shadow-lg animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-300">Action Required</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-sm flex items-start space-x-3 shadow-lg animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-300">Success</p>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Studio Workspace Tabs */}
        <div className="flex border-b border-border-default/50 space-x-2 sm:space-x-4 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'generate'
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-neon-glow'
                : 'text-text-muted hover:text-white hover:bg-surface-subtle'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>1. Vision & Structured Brief</span>
          </button>

          <button
            onClick={() => setActiveTab('directions')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'directions'
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-neon-glow'
                : 'text-text-muted hover:text-white hover:bg-surface-subtle'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>2. Creative Directions ({creativeDirections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('moodboard')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'moodboard'
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-neon-glow'
                : 'text-text-muted hover:text-white hover:bg-surface-subtle'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>3. Moodboard Intelligence ({moodboardUrls.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requirements')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'requirements'
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-neon-glow'
                : 'text-text-muted hover:text-white hover:bg-surface-subtle'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. Requirement Synthesis</span>
          </button>

          <button
            onClick={() => setActiveTab('improver')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'improver'
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-neon-glow'
                : 'text-text-muted hover:text-white hover:bg-surface-subtle'
            }`}
          >
            <Split className="w-4 h-4" />
            <span>5. AI Field Improver</span>
          </button>

          <button
            onClick={() => {
              loadSavedDraftsList();
              setActiveTab('saved');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'saved'
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-neon-glow'
                : 'text-text-muted hover:text-white hover:bg-surface-subtle'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Saved Drafts</span>
          </button>
        </div>

        {/* TAB 1: NATURAL LANGUAGE VISION & STRUCTURED BRIEF */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Form Inputs & Presets */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-border-default/60 bg-surface-card/90">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-accent-cyan" />
                    <span>Describe Your Creative Vision</span>
                  </h3>
                  <Badge variant="cyan" size="sm">Natural Language</Badge>
                </div>

                {/* Prompt Presets */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-text-muted mb-2">Quick Inspiration Presets:</label>
                  <div className="flex flex-wrap gap-2">
                    {promptPresets.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setPrompt(preset.prompt);
                          setCategory(preset.category);
                        }}
                        className="text-xs px-2.5 py-1 rounded-md bg-surface-subtle hover:bg-surface-hover border border-border-default text-text-secondary hover:text-white transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                      Campaign Description & Visual Intent *
                    </label>
                    <textarea
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. We are launching a premium sustainable skincare product. We need cinematic social videos and product visuals aimed at young urban customers..."
                      className="w-full rounded-xl bg-surface-subtle border border-border-default px-3.5 py-2.5 text-sm text-white placeholder-text-muted focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                      >
                        <option value="3D Animation & Motion">3D Animation & Motion</option>
                        <option value="AI Art & Concept Direction">AI Art & Concept Direction</option>
                        <option value="Video Production & Direction">Video Production & Direction</option>
                        <option value="Brand Identity & Design">Brand Identity & Design</option>
                        <option value="Visual Effects & Simulation">Visual Effects & Simulation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Target Timeline</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={52}
                          value={timelineWeeks || ''}
                          onChange={(e) => setTimelineWeeks(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                          placeholder="4"
                          className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-text-muted">weeks</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-text-muted mb-1">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Min Budget</label>
                      <input
                        type="number"
                        value={knownBudgetMin || ''}
                        onChange={(e) => setKnownBudgetMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="2000"
                        className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1">Max Budget</label>
                      <input
                        type="number"
                        value={knownBudgetMax || ''}
                        onChange={(e) => setKnownBudgetMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="5000"
                        className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-neon-glow"
                    onClick={handleGenerateBrief}
                    disabled={isGenerating || !prompt.trim()}
                    isLoading={isGenerating}
                    leftIcon={<Sparkles className="w-5 h-5" />}
                  >
                    {isGenerating ? 'Structuring Creative Brief...' : 'Generate Structured Brief'}
                  </Button>
                </div>
              </Card>

              {/* Usage / Cost Visibility */}
              {latestUsage && (
                <Card className="p-4 border-border-default/40 bg-surface-subtle/40 text-xs text-text-muted space-y-1">
                  <div className="flex items-center justify-between text-text-secondary font-medium">
                    <span>AI Execution Metrics</span>
                    <Badge variant="cyan" size="sm">{latestUsage.latencyMs}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="text-white font-mono">{latestUsage.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tokens Processed:</span>
                    <span className="text-white font-mono">{latestUsage.totalTokens} tokens</span>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Live Structured Brief Preview */}
            <div className="lg:col-span-7">
              {structuredBrief ? (
                <div className="space-y-6 animate-fadeIn">
                  <Card className="p-6 border-accent-cyan/30 bg-surface-card/95 shadow-xl">
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-default/50">
                      <div>
                        <Badge variant="cyan" size="sm" className="mb-2">AI Generated Brief v1.0</Badge>
                        <h2 className="text-xl font-bold text-white tracking-tight">{structuredBrief.title}</h2>
                        <p className="text-sm text-text-secondary mt-1">{structuredBrief.summary}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('directions')}
                        leftIcon={<Compass className="w-4 h-4" />}
                      >
                        Explore Directions
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
                      <div className="p-3 rounded-lg bg-surface-subtle/60 border border-border-default">
                        <span className="text-text-muted uppercase font-bold tracking-wider">Objective</span>
                        <p className="text-text-secondary mt-1">{structuredBrief.objective}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-subtle/60 border border-border-default">
                        <span className="text-text-muted uppercase font-bold tracking-wider">Target Audience</span>
                        <p className="text-text-secondary mt-1">{structuredBrief.targetAudience}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 my-4">
                      <div className="flex items-center space-x-2 text-accent-cyan font-semibold text-xs mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Core Creative Approach</span>
                      </div>
                      <p className="text-sm text-text-primary leading-relaxed">{structuredBrief.creativeApproach}</p>
                    </div>

                    {/* Deliverables Preview */}
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                        Synthesized Deliverables ({structuredBrief.deliverables?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {structuredBrief.deliverables?.map((del, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg bg-surface-subtle/80 border border-border-default flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-sm text-white">{del.quantity}x {del.name}</span>
                                <Badge variant="neutral" size="sm">{del.format}</Badge>
                                {del.dimensionsOrRatio && <Badge variant="neutral" size="sm">{del.dimensionsOrRatio}</Badge>}
                              </div>
                              {del.acceptanceCriteria && del.acceptanceCriteria.length > 0 && (
                                <p className="text-xs text-text-muted mt-1">
                                  Criteria: {del.acceptanceCriteria[0]}
                                </p>
                              )}
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Acceptance Criteria & Constraints */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-border-default/50 text-xs">
                      <div>
                        <span className="font-bold text-text-muted uppercase tracking-wider">Acceptance Criteria</span>
                        <ul className="mt-2 space-y-1 text-text-secondary list-disc list-inside">
                          {structuredBrief.acceptanceCriteria?.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-text-muted uppercase tracking-wider">Brand Constraints</span>
                        <ul className="mt-2 space-y-1 text-text-secondary list-disc list-inside">
                          {structuredBrief.constraints?.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="p-12 border-dashed border-border-default/60 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border-default flex items-center justify-center text-text-muted mb-4">
                    <Sparkles className="w-8 h-8 text-accent-cyan/40" />
                  </div>
                  <h3 className="text-base font-semibold text-white">Live Brief Studio Preview</h3>
                  <p className="text-sm text-text-muted max-w-md mt-1 mb-6">
                    Enter your campaign vision on the left to synthesize structured objectives, deliverables, acceptance criteria, and creative guidance.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPrompt(promptPresets[0].prompt);
                      setCategory(promptPresets[0].category);
                    }}
                  >
                    Load Sample Cyberpunk Prompt
                  </Button>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CREATIVE DIRECTIONS */}
        {activeTab === 'directions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-default/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-accent-cyan" />
                  <span>Alternative Creative Directions</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Distinct visual concepts with validated hex color palettes, lighting rules, and camera direction.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateDirections()}
                disabled={isGenerating || !structuredBrief}
                isLoading={isGenerating}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Regenerate 3 Directions
              </Button>
            </div>

            {creativeDirections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {creativeDirections.map((dir, idx) => {
                  const isSelected = selectedDirectionIdx === idx;
                  return (
                    <Card
                      key={idx}
                      className={`p-5 flex flex-col justify-between transition-all relative ${
                        isSelected
                          ? 'border-accent-cyan bg-surface-card ring-2 ring-accent-cyan/40 shadow-neon-glow'
                          : 'border-border-default/70 bg-surface-card/60 hover:border-border-default'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={isSelected ? 'cyan' : 'neutral'} size="sm">
                            Direction #{idx + 1}
                          </Badge>
                          {isSelected && (
                            <span className="flex items-center text-xs text-accent-cyan font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight">{dir.directionName}</h3>
                        <p className="text-xs text-text-secondary mt-2 leading-relaxed">{dir.creativeConcept}</p>

                        {/* Mood Tags */}
                        <div className="flex flex-wrap gap-1.5 my-3">
                          {dir.moodAndTone?.map((mood, mIdx) => (
                            <Badge key={mIdx} variant="neutral" size="sm">
                              {mood}
                            </Badge>
                          ))}
                        </div>

                        {/* Color Palette Swatches */}
                        <div className="my-4 p-3 rounded-lg bg-surface-subtle/80 border border-border-default">
                          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block mb-2">
                            Color Palette ({dir.colorPalette?.length || 0})
                          </span>
                          <div className="grid grid-cols-4 gap-2">
                            {dir.colorPalette?.map((col, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                title={`Click to copy ${col.hex}`}
                                onClick={() => copyToClipboard(col.hex)}
                                className="group flex flex-col items-center"
                              >
                                <div
                                  className="w-full h-8 rounded-md border border-white/10 shadow-inner group-hover:scale-105 transition-transform"
                                  style={{ backgroundColor: col.hex }}
                                />
                                <span className="text-[10px] font-mono text-text-muted mt-1 group-hover:text-accent-cyan flex items-center">
                                  {copiedHex === col.hex ? <Check className="w-3 h-3 text-emerald-400" /> : col.hex}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Visual & Lighting Guidance */}
                        <div className="space-y-2 text-xs text-text-secondary border-t border-border-default/40 pt-3">
                          <div>
                            <span className="font-semibold text-text-muted">Visual Style:</span>
                            <p className="text-white mt-0.5">{dir.visualStyle}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-text-muted">Lighting & Camera:</span>
                            <p className="text-text-secondary mt-0.5">{dir.lightingAndComposition}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-text-muted">Tradeoffs:</span>
                            <p className="text-amber-400/90 mt-0.5">{dir.strengthsAndTradeoffs?.tradeoffs?.[0]}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-border-default/50">
                        <Button
                          variant={isSelected ? 'primary' : 'outline'}
                          size="sm"
                          className="w-full"
                          onClick={() => setSelectedDirectionIdx(idx)}
                        >
                          {isSelected ? 'Selected Direction' : 'Select this Direction'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center border-dashed border-border-default/60">
                <Compass className="w-10 h-10 text-accent-cyan/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No Creative Directions Generated Yet</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">
                  Synthesize 3 distinct creative concepts with validated hex color palettes, lighting rules, and production tradeoffs.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleGenerateDirections()}
                  disabled={isGenerating || !structuredBrief}
                  isLoading={isGenerating}
                >
                  Generate 3 Creative Directions
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* TAB 3: MOODBOARD INTELLIGENCE */}
        {activeTab === 'moodboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-border-default bg-surface-card">
                <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-2">
                  <Palette className="w-4 h-4 text-accent-cyan" />
                  <span>Reference Image URLs (SSRF Guarded)</span>
                </h3>
                <p className="text-xs text-text-muted mb-4">
                  Add public HTTPS image URLs from Unsplash, CDN, or design portfolio links. Max 8 references.
                </p>

                <div className="flex space-x-2 mb-4">
                  <input
                    type="url"
                    value={newMoodboardUrl}
                    onChange={(e) => setNewMoodboardUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-xs text-white placeholder-text-muted focus:border-accent-cyan"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddMoodboardUrl}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>

                {/* URL Collection Grid */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {moodboardUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle/80 border border-border-default text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Badge variant="cyan" size="sm">#{idx + 1}</Badge>
                        <span className="text-text-secondary truncate max-w-[200px]">{url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMoodboardUrl(idx)}
                        className="text-text-muted hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-border-default">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-neon-glow"
                    onClick={handleAnalyzeMoodboard}
                    disabled={isGenerating || moodboardUrls.length === 0}
                    isLoading={isGenerating}
                    leftIcon={<Wand2 className="w-4 h-4" />}
                  >
                    Analyze Moodboard ({moodboardUrls.length} Images)
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-7">
              {moodboardAnalysis ? (
                <Card className="p-6 border-accent-cyan/30 bg-surface-card space-y-6">
                  <div>
                    <Badge variant="cyan" size="sm" className="mb-2">Moodboard Intelligence</Badge>
                    <h3 className="text-lg font-bold text-white tracking-tight">Extracted Color & Lighting Insights</h3>
                  </div>

                  {/* Dominant Colors */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-3">
                      Dominant Color Harmonies
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {moodboardAnalysis.dominantColors?.map((col, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-surface-subtle border border-border-default">
                          <div
                            className="w-full h-10 rounded-md border border-white/10 mb-2 shadow-inner"
                            style={{ backgroundColor: col.hex }}
                          />
                          <p className="text-xs font-semibold text-white truncate">{col.name}</p>
                          <div className="flex items-center justify-between text-[11px] text-text-muted mt-0.5">
                            <span className="font-mono">{col.hex}</span>
                            {col.weight && <span>{col.weight}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual Tone & Lighting */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-border-default">
                      <span className="font-bold text-accent-cyan uppercase tracking-wider">Lighting Characteristics</span>
                      <p className="text-text-secondary mt-1.5 leading-relaxed">{moodboardAnalysis.lightingCharacteristics}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-border-default">
                      <span className="font-bold text-accent-cyan uppercase tracking-wider">Composition & Framing</span>
                      <p className="text-text-secondary mt-1.5 leading-relaxed">{moodboardAnalysis.compositionAndFraming}</p>
                    </div>
                  </div>

                  {/* Texture & Material Cues */}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">
                      Texture & Material Cues
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {moodboardAnalysis.textureAndMaterialCues?.map((cue, idx) => (
                        <Badge key={idx} variant="neutral" size="sm">{cue}</Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center border-dashed border-border-default/60">
                  <Palette className="w-10 h-10 text-accent-cyan/40 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white">No Moodboard Analysis Yet</h3>
                  <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">
                    Add 1 to 8 reference image URLs on the left to extract dominant hex palettes, lighting characteristics, and material cues.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REQUIREMENT SYNTHESIS */}
        {activeTab === 'requirements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border-default/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-accent-cyan" />
                  <span>Actionable Deliverable Synthesis</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Production-ready asset specifications, format standards, and suggested delivery milestones.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSynthesizeRequirements}
                disabled={isGenerating || !structuredBrief}
                isLoading={isGenerating}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Synthesize Requirements
              </Button>
            </div>

            {synthesizedRequirements ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {synthesizedRequirements.deliverables?.map((del, idx) => (
                    <Card key={idx} className="p-5 border-border-default bg-surface-card/90 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="cyan" size="sm" className="mb-1">{del.quantity}x Deliverable</Badge>
                          <h4 className="text-base font-bold text-white">{del.name}</h4>
                        </div>
                        <Badge variant="neutral" size="sm">{del.format}</Badge>
                      </div>

                      <p className="text-xs text-text-secondary">{del.requiredContent}</p>

                      <div className="text-xs space-y-1.5 pt-2 border-t border-border-default/40">
                        {del.dimensionsOrRatio && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">Aspect Ratio / Specs:</span>
                            <span className="text-white font-mono">{del.dimensionsOrRatio}</span>
                          </div>
                        )}
                        {del.milestoneGrouping && (
                          <div className="flex justify-between">
                            <span className="text-text-muted">Milestone Phase:</span>
                            <span className="text-accent-cyan">{del.milestoneGrouping}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Suggested Production Milestones */}
                {synthesizedRequirements.suggestedMilestones && synthesizedRequirements.suggestedMilestones.length > 0 && (
                  <Card className="p-6 border-accent-cyan/20 bg-surface-card">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-accent-cyan" />
                      <span>Suggested Production Milestone Breakdown</span>
                    </h3>

                    <div className="space-y-3">
                      {synthesizedRequirements.suggestedMilestones.map((phase, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-surface-subtle border border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="cyan" size="sm">Phase {idx + 1}</Badge>
                              <span className="font-semibold text-white text-sm">{phase.phaseName}</span>
                            </div>
                            <p className="text-xs text-text-muted mt-1">
                              Key Milestone: {phase.keyMilestoneDeliverable}
                            </p>
                          </div>
                          <Badge variant="neutral" size="sm">{phase.estimatedDurationWeeks} Weeks</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-12 text-center border-dashed border-border-default/60">
                <Layers className="w-10 h-10 text-accent-cyan/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No Synthesized Requirements Yet</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">
                  Break down high-level campaign concepts into granular file formats, aspect ratios, and production phases.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSynthesizeRequirements}
                  disabled={isGenerating || !structuredBrief}
                  isLoading={isGenerating}
                >
                  Synthesize Deliverables & Milestones
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* TAB 5: AI FIELD IMPROVER & DIFF REVIEW */}
        {activeTab === 'improver' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-border-default bg-surface-card">
                <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
                  <Split className="w-4 h-4 text-accent-cyan" />
                  <span>AI Field Refiner & Rewriter</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Target Field</label>
                    <select
                      value={improverField}
                      onChange={(e) => setImproverField(e.target.value)}
                      className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                    >
                      <option value="summary">Summary & Elevator Pitch</option>
                      <option value="objective">Campaign Objective</option>
                      <option value="creativeApproach">Creative Approach & Rationale</option>
                      <option value="coreMessage">Core Brand Message</option>
                      <option value="targetAudience">Target Audience Profile</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Refinement Goal</label>
                    <select
                      value={improverGoal}
                      onChange={(e) => setImproverGoal(e.target.value)}
                      className="w-full rounded-xl bg-surface-subtle border border-border-default px-3 py-2 text-sm text-white focus:border-accent-cyan"
                    >
                      <option value="improve_clarity">Improve Clarity & Precision</option>
                      <option value="rewrite_professionally">Rewrite with Executive Professionalism</option>
                      <option value="shorten">Condense & Tighten Prose</option>
                      <option value="expand_rationale">Expand Creative Rationale</option>
                      <option value="increase_specificity">Increase Technical Medium Specificity</option>
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-neon-glow"
                    onClick={handleImproveField}
                    disabled={isGenerating || !structuredBrief}
                    isLoading={isGenerating}
                    leftIcon={<Wand2 className="w-4 h-4" />}
                  >
                    Generate AI Improvement
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-7">
              {improverResult ? (
                <Card className="p-6 border-accent-cyan/40 bg-surface-card space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-border-default">
                    <div>
                      <Badge variant="cyan" size="sm" className="mb-1">Side-by-Side Review</Badge>
                      <h3 className="text-base font-bold text-white capitalize">Refinement for {improverField}</h3>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setImproverResult(null)}>
                        Reject
                      </Button>
                      <Button variant="primary" size="sm" onClick={handleApplyImprovement} leftIcon={<Check className="w-4 h-4" />}>
                        Apply to Brief
                      </Button>
                    </div>
                  </div>

                  {/* Diff Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30">
                      <span className="font-bold text-red-400 uppercase tracking-wider block mb-2">Original Text</span>
                      <p className="text-text-secondary leading-relaxed">
                        {improverField === 'summary' && structuredBrief?.summary}
                        {improverField === 'objective' && structuredBrief?.objective}
                        {improverField === 'creativeApproach' && structuredBrief?.creativeApproach}
                        {improverField === 'coreMessage' && structuredBrief?.coreMessage}
                        {improverField === 'targetAudience' && structuredBrief?.targetAudience}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-2">AI Proposed Refinement</span>
                      <p className="text-white leading-relaxed">{improverResult.suggestedImprovement}</p>
                    </div>
                  </div>

                  {/* Rationale & Consistency */}
                  <div className="p-4 rounded-xl bg-surface-subtle/80 border border-border-default text-xs space-y-2">
                    <span className="font-bold text-accent-cyan uppercase tracking-wider block">AI Editorial Rationale</span>
                    <p className="text-text-secondary">{improverResult.rationale}</p>
                    <p className="text-text-muted text-[11px] pt-1">
                      Summary of changes: {improverResult.changesSummary}
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="p-12 text-center border-dashed border-border-default/60">
                  <Split className="w-10 h-10 text-accent-cyan/40 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white">No Active Diff Review</h3>
                  <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">
                    Select a brief section on the left and a refinement goal to review side-by-side improvements.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SAVED DRAFTS WORKSPACE */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border-default/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <FolderOpen className="w-5 h-5 text-accent-cyan" />
                  <span>Saved AI Creative Drafts</span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Persisted creative drafts saved in your MongoDB workspace.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadSavedDraftsList}
                isLoading={loadingDrafts}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Refresh List
              </Button>
            </div>

            {savedDrafts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedDrafts.map((d) => (
                  <Card key={d.id} className="p-5 border-border-default bg-surface-card hover:border-accent-cyan/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="cyan" size="sm">v{d.version}</Badge>
                        <span className="text-[11px] text-text-muted font-mono">{new Date(d.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-base font-bold text-white tracking-tight">{d.title}</h4>
                      <p className="text-xs text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">
                        {d.structuredBrief?.summary || d.userPrompt}
                      </p>

                      <div className="flex items-center gap-2 mt-4 text-[11px] text-text-muted">
                        <span>{d.creativeDirections?.length || 0} Directions</span>
                        <span>•</span>
                        <span>{d.moodboardReferences?.length || 0} Moodboard URLs</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border-default flex items-center justify-between gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          loadDraft(d.id);
                          setActiveTab('generate');
                        }}
                      >
                        Load Session
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (confirm('Delete this creative draft?')) {
                            await deleteCreativeDraft(d.id);
                            loadSavedDraftsList();
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center border-dashed border-border-default/60">
                <FolderOpen className="w-10 h-10 text-accent-cyan/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No Saved Creative Drafts</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-4">
                  Generate a brief and click "Save Draft" to preserve your work and creative directions in your account.
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeStudioPage;
