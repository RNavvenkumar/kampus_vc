import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CampaignBrief, CampaignProposal, PortfolioItem, ServiceItem } from '../../types';
import {
  getPublicBriefByIdOrSlug,
  getMyPortfolio,
  getMyServices,
  createProposal,
  getProposalById,
  updateProposal,
  submitProposal,
  extractErrorMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Briefcase,
  Layers,
  Send,
  Save,
  Info,
  Play
} from 'lucide-react';

const isVideoMedia = (url?: string, type?: string) => {
  if (type === 'video') return true;
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/');
};

interface MilestoneInput {
  title: string;
  description: string;
  amount: number;
  durationWeeks: number;
  order: number;
}

export const PitchStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { briefId, proposalId } = useParams<{ briefId?: string; proposalId?: string }>();
  const isEditingExisting = Boolean(proposalId);

  // Data states
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [existingProposal, setExistingProposal] = useState<CampaignProposal | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Form states
  const [pitchTitle, setPitchTitle] = useState('');
  const [pitchMessage, setPitchMessage] = useState('');
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [proposedPrice, setProposedPrice] = useState<number>(2500);
  const [deliveryDurationWeeks, setDeliveryDurationWeeks] = useState<number>(3);
  const [targetStartDate, setTargetStartDate] = useState<string>('');
  const [deliverables, setDeliverables] = useState<string[]>(['']);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: 'Initial Concept & Layout', description: 'Review concept boards and blockout', amount: 1000, durationWeeks: 1, order: 1 },
    { title: 'Final Production & Delivery', description: 'Complete final rendering and master assets', amount: 1500, durationWeeks: 2, order: 2 }
  ]);
  const [revisionAllowance, setRevisionAllowance] = useState<number>(2);

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load creator portfolio and services in parallel
        const [portfolioRes, servicesRes] = await Promise.all([
          getMyPortfolio().catch(() => ({ items: [], total: 0 })),
          getMyServices().catch(() => ({ services: [], total: 0 }))
        ]);
        setPortfolioItems(portfolioRes?.items || []);
        setServices((servicesRes?.services || []).filter((s: ServiceItem) => s.status === 'active'));

        if (isEditingExisting && proposalId) {
          const prop = await getProposalById(proposalId);
          setExistingProposal(prop);
          setPitchTitle(prop.pitchTitle || '');
          setPitchMessage(prop.pitchMessage || '');
          setSelectedPortfolioIds(prop.referencedPortfolioItemIds || []);
          setSelectedServiceId(prop.referencedServiceId || '');
          setProposedPrice(prop.proposedPrice);
          setDeliveryDurationWeeks(prop.deliveryDurationWeeks);
          setTargetStartDate(prop.targetStartDate ? prop.targetStartDate.substring(0, 10) : '');
          setDeliverables(prop.deliverables && prop.deliverables.length > 0 ? prop.deliverables : ['']);
          if (prop.milestones && prop.milestones.length > 0) {
            setMilestones(
              prop.milestones.map((m) => ({
                title: m.title,
                description: m.description || '',
                amount: m.amount || 0,
                durationWeeks: m.durationWeeks || 1,
                order: m.order
              }))
            );
          }
          setRevisionAllowance(prop.revisionAllowance ?? 2);

          // Get brief from populated prop or briefId
          const bId = (prop.briefId as any)?.id || (prop.briefId as any)?._id || prop.briefId;
          const briefData = await getPublicBriefByIdOrSlug(bId);
          setBrief(briefData);
        } else if (briefId) {
          const briefData = await getPublicBriefByIdOrSlug(briefId);
          setBrief(briefData);
          setProposedPrice(briefData.budgetMin || 2000);
          setDeliveryDurationWeeks(briefData.durationWeeks || 4);
          if (briefData.deliverables && briefData.deliverables.length > 0) {
            setDeliverables([...briefData.deliverables]);
          }
        }
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load campaign context or proposal data.'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [briefId, proposalId, isEditingExisting]);

  const togglePortfolioSelect = (id: string) => {
    setSelectedPortfolioIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddDeliverable = () => {
    setDeliverables((prev) => [...prev, '']);
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeliverableChange = (index: number, val: string) => {
    setDeliverables((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleAddMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        title: `Milestone ${prev.length + 1}`,
        description: '',
        amount: 500,
        durationWeeks: 1,
        order: prev.length + 1
      }
    ]);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index: number, field: keyof MilestoneInput, val: any) => {
    setMilestones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const milestoneTotal = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const milestoneSumMatches = Math.abs(milestoneTotal - proposedPrice) < 0.05;

  const handleSubmit = async (asDraft: boolean) => {
    try {
      setError(null);
      setSuccessMsg(null);
      setSubmitting(true);

      const cleanedDeliverables = deliverables.map((d) => d.trim()).filter((d) => d.length > 0);
      if (cleanedDeliverables.length === 0) {
        setError('Please list at least one deliverable in your offer.');
        setSubmitting(false);
        return;
      }

      if (pitchMessage.trim().length < 20) {
        setError('Pitch message must be at least 20 characters.');
        setSubmitting(false);
        return;
      }

      if (proposedPrice <= 0) {
        setError('Proposed price must be greater than zero.');
        setSubmitting(false);
        return;
      }

      if (milestones.length > 0 && !milestoneSumMatches) {
        setError(`Milestone total ($${milestoneTotal}) must equal your proposed total price ($${proposedPrice}).`);
        setSubmitting(false);
        return;
      }

      const activeBriefId = brief?.id || (brief as any)?._id || briefId;
      if (!activeBriefId) {
        setError('Campaign brief is missing.');
        setSubmitting(false);
        return;
      }

      const payload = {
        briefId: activeBriefId,
        pitchTitle: pitchTitle.trim() || undefined,
        pitchMessage: pitchMessage.trim(),
        referencedPortfolioItemIds: selectedPortfolioIds,
        referencedServiceId: selectedServiceId || undefined,
        proposedPrice: Number(proposedPrice),
        currency: brief?.currency || 'INR',
        deliveryDurationWeeks: Number(deliveryDurationWeeks),
        targetStartDate: targetStartDate || undefined,
        deliverables: cleanedDeliverables,
        milestones: milestones.map((m, idx) => ({
          title: m.title.trim(),
          description: m.description.trim() || undefined,
          amount: Number(m.amount) || undefined,
          durationWeeks: Number(m.durationWeeks) || 1,
          order: idx + 1
        })),
        revisionAllowance: Number(revisionAllowance),
        isDraft: asDraft
      };

      if (isEditingExisting && proposalId) {
        await updateProposal(proposalId, payload);
        if (!asDraft) {
          await submitProposal(proposalId);
        }
        setSuccessMsg(asDraft ? 'Proposal draft saved successfully.' : 'Proposal submitted successfully!');
        setTimeout(() => navigate('/creator/proposals'), 1200);
      } else {
        await createProposal(payload);
        setSuccessMsg(asDraft ? 'Proposal draft saved successfully.' : 'Proposal submitted to brand!');
        setTimeout(() => navigate('/creator/proposals'), 1200);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save or submit proposal.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090B10] text-white flex items-center justify-center py-24">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#58D5FF]/30 border-t-[#58D5FF] rounded-full animate-spin" />
          <p className="text-gray-400 font-medium">Preparing Pitch Studio workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090B10] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
          <div>
            <Link
              to="/creator/proposals"
              className="inline-flex items-center text-sm text-gray-400 hover:text-[#58D5FF] transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Creator Proposals
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>{isEditingExisting ? 'Edit Proposal & Revisions' : 'Creator Pitch Studio'}</span>
              <Badge variant="cyan" size="sm">Proposal Studio</Badge>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Submit structured commercial offers, custom pitches, milestone schedules, and portfolio evidence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-2 border-[#1F2937] hover:border-gray-600"
            >
              <Save className="w-4 h-4 text-gray-400" />
              <span>Save Draft</span>
            </Button>
            <Button
              variant="primary"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-2 shadow-lg shadow-[#58D5FF]/10"
            >
              <Send className="w-4 h-4" />
              <span>{isEditingExisting && existingProposal?.status === 'revision_requested' ? 'Resubmit Revisions' : 'Submit Proposal'}</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Action Failed</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Success</p>
              <p className="text-sm opacity-90">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Revision feedback banner if revising */}
        {existingProposal?.status === 'revision_requested' && existingProposal.revisionMessage && (
          <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-600/50 text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-base mb-1">
              <Info className="w-5 h-5" />
              <span>Brand Revision Feedback (Version #{existingProposal.revisionNumber})</span>
            </div>
            <p className="text-sm text-amber-100/90 leading-relaxed bg-[#11151D]/60 p-3 rounded-lg border border-amber-800/40">
              "{existingProposal.revisionMessage}"
            </p>
            <p className="text-xs text-amber-400/80 mt-2">
              Please adjust your scope, timeline, deliverables, or commercial terms below before resubmitting.
            </p>
          </div>
        )}

        {/* Section 1: Campaign Context */}
        {brief && (
          <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2937]/70 pb-3">
              <div>
                <span className="text-xs font-semibold tracking-wider text-[#58D5FF] uppercase">Campaign Context</span>
                <h2 className="text-xl font-bold text-white mt-0.5">{brief.title}</h2>
                <p className="text-sm text-gray-400">By {brief.companyName || brief.brand?.companyName || 'Brand'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">{brief.category}</Badge>
                <Badge variant="cyan" size="sm">
                  Budget: ₹{brief.budgetMin?.toLocaleString()} - ₹{brief.budgetMax?.toLocaleString()} {brief.currency === 'USD' ? 'INR' : brief.currency}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300 pt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#58D5FF]" />
                <span>Target Duration: <strong>{brief.durationWeeks} weeks</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#58D5FF]" />
                <span>Deliverables: <strong>{brief.deliverables?.length || 0} requested</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#58D5FF]" />
                <span>Currency: <strong>{brief.currency}</strong></span>
              </div>
            </div>
          </Card>
        )}

        {/* Section 2: Creator Pitch */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-6">
          <div className="border-b border-[#1F2937] pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#58D5FF]" />
              <span>Section 1: Custom Creative Pitch</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Introduce your creative vision, methodology, and why you are the best fit for this brief.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Pitch Title / Angle <span className="text-gray-500 text-xs">(Optional)</span>
              </label>
              <Input
                placeholder="e.g. End-to-End Procedural 3D & Runway Gen-3 Cinematic Direction"
                value={pitchTitle}
                onChange={(e) => setPitchTitle(e.target.value)}
                maxLength={150}
                className="bg-[#090B10] border-[#1F2937] text-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">
                  Personalized Message & Methodology <span className="text-rose-400">*</span>
                </label>
                <span className="text-xs text-gray-500">{pitchMessage.length} / 3000 chars (min 20)</span>
              </div>
              <textarea
                rows={6}
                value={pitchMessage}
                onChange={(e) => setPitchMessage(e.target.value)}
                maxLength={3000}
                placeholder="Describe your creative approach, production pipeline, tools, and technical delivery strategy..."
                className="w-full bg-[#090B10] border border-[#1F2937] rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#58D5FF] focus:ring-1 focus:ring-[#58D5FF]"
              />
            </div>

            {/* Portfolio Selections */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Attach Relevant Portfolio Evidence <span className="text-gray-500 text-xs">(Verified from your studio)</span>
              </label>
              {portfolioItems.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#090B10] border border-[#1F2937] text-gray-400 text-sm">
                  No portfolio items found. You can add portfolio items in the Creator Studio to attach proof of work.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {portfolioItems.map((item) => {
                    const isSelected = selectedPortfolioIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => togglePortfolioSelect(item.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-[#58D5FF]/10 border-[#58D5FF]'
                            : 'bg-[#090B10] border-[#1F2937] hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 rounded bg-black border-gray-700 text-[#58D5FF] focus:ring-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          {(item.thumbnailUrl || item.mediaUrl) && (
                            <div className="mt-2 relative w-full h-20 rounded border border-[#1F2937] overflow-hidden bg-black/40">
                              {isVideoMedia(item.mediaUrl, item.mediaType) ? (
                                item.thumbnailUrl ? (
                                  <div className="relative w-full h-full">
                                    <img
                                      src={item.thumbnailUrl}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <div className="w-6 h-6 rounded-full bg-[#58D5FF] text-black flex items-center justify-center shadow">
                                        <Play className="w-3 h-3 fill-black ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <video
                                    src={item.mediaUrl}
                                    className="w-full h-full object-cover"
                                    muted
                                    preload="metadata"
                                  />
                                )
                              ) : (
                                <img
                                  src={item.thumbnailUrl || item.mediaUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional Service Selection */}
            {services.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tie to Packaged Service Package <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full bg-[#090B10] border border-[#1F2937] rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#58D5FF]"
                >
                  <option value="">No packaged service tied (Custom Proposal)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — ${s.price} ({s.turnaroundDays} days)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        {/* Section 3: Commercial Terms & Deliverables */}
        <Card className="p-6 bg-[#11151D] border-[#1F2937] rounded-xl space-y-6">
          <div className="border-b border-[#1F2937] pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Section 2: Commercial Terms & Scope</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Define the price, turnaround, deliverables, and revision allowance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Total Proposed Price ({brief?.currency || 'INR'}) <span className="text-rose-400">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={proposedPrice}
                onChange={(e) => setProposedPrice(Number(e.target.value))}
                className="bg-[#090B10] border-[#1F2937] text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Turnaround Duration (Weeks) <span className="text-rose-400">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={52}
                value={deliveryDurationWeeks}
                onChange={(e) => setDeliveryDurationWeeks(Number(e.target.value))}
                className="bg-[#090B10] border-[#1F2937] text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Revision Allowance
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                value={revisionAllowance}
                onChange={(e) => setRevisionAllowance(Number(e.target.value))}
                className="bg-[#090B10] border-[#1F2937] text-white"
              />
            </div>
          </div>

          {/* Deliverables Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Deliverables Scope <span className="text-rose-400">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDeliverable}
                className="flex items-center gap-1.5 text-xs py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Deliverable
              </Button>
            </div>

            <div className="space-y-2">
              {deliverables.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`e.g. Deliverable ${index + 1}`}
                    value={item}
                    onChange={(e) => handleDeliverableChange(index, e.target.value)}
                    className="bg-[#090B10] border-[#1F2937] text-white flex-1"
                  />
                  {deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(index)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove deliverable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Milestone Schedule */}
          <div className="space-y-3 pt-4 border-t border-[#1F2937]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Milestone Schedule & Payment Allocations
                </label>
                <p className="text-xs text-gray-500">
                  Total of milestone allocations must match proposed price.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={milestoneSumMatches ? 'success' : 'error'} size="sm">
                  Sum: ${milestoneTotal} / ${proposedPrice} {milestoneSumMatches ? '✓ Matched' : '⚠ Mismatch'}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMilestone}
                  className="flex items-center gap-1.5 text-xs py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Milestone
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {milestones.map((m, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-[#090B10] border border-[#1F2937] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Milestone Title"
                      value={m.title}
                      onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                      className="w-full bg-[#11151D] border border-[#1F2937] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#58D5FF]"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-gray-500 text-xs">$</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={m.amount}
                        onChange={(e) => handleMilestoneChange(index, 'amount', Number(e.target.value))}
                        className="w-full bg-[#11151D] border border-[#1F2937] rounded pl-6 pr-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#58D5FF]"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Weeks"
                      value={m.durationWeeks}
                      onChange={(e) => handleMilestoneChange(index, 'durationWeeks', Number(e.target.value))}
                      className="w-full bg-[#11151D] border border-[#1F2937] rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#58D5FF]"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(index)}
                        className="p-1.5 text-gray-500 hover:text-red-400"
                        title="Remove milestone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-[#11151D] border border-[#1F2937] rounded-xl">
          <div>
            <p className="text-sm font-semibold text-white">Ready to send your proposal?</p>
            <p className="text-xs text-gray-400">
              Drafts remain private to you. Submitted proposals are immediately available for brand review.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="flex items-center gap-2 border-[#1F2937]"
            >
              <Save className="w-4 h-4 text-gray-400" />
              <span>Save Draft</span>
            </Button>
            <Button
              variant="primary"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isEditingExisting && existingProposal?.status === 'revision_requested' ? 'Resubmit Revisions' : 'Submit Proposal'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
