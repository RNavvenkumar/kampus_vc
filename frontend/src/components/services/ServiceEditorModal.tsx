import React, { useState, useEffect, ChangeEvent } from 'react';
import { ServiceItem } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Sparkles, Plus, Trash2, AlertCircle } from 'lucide-react';

interface ServiceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Partial<ServiceItem>) => Promise<void>;
  initialData?: ServiceItem | null;
}

const SERVICE_CATEGORIES = [
  'Concept Art & Keyframes',
  '3D Modeling & Animation',
  'Generative Video & Trailers',
  'Brand Identity Sprint',
  'Prompt Architecture & Tuning',
  'Motion Graphics & VFX',
  'Audio & Sound Design',
  'Custom Creative Direction'
];

export const ServiceEditorModal: React.FC<ServiceEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Concept Art & Keyframes');
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState<string[]>(['']);
  const [revisions, setRevisions] = useState<number>(2);
  const [price, setPrice] = useState<number>(5000);
  const [currency, setCurrency] = useState('INR');
  const [turnaroundDays, setTurnaroundDays] = useState<number>(5);
  const [packageTier, setPackageTier] = useState<'starter' | 'standard' | 'premium'>('standard');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'Concept Art & Keyframes');
      setDescription(initialData.description || '');
      setDeliverables(initialData.deliverables?.length ? initialData.deliverables : ['']);
      setRevisions(initialData.revisions ?? 2);
      setPrice(initialData.price ?? 5000);
      setCurrency(initialData.currency || 'INR');
      setTurnaroundDays(initialData.turnaroundDays ?? 5);
      setPackageTier(initialData.packageTier || 'standard');
      setStatus(initialData.status || 'active');
    } else {
      setTitle('');
      setCategory('Concept Art & Keyframes');
      setDescription('');
      setDeliverables(['']);
      setRevisions(2);
      setPrice(5000);
      setCurrency('INR');
      setTurnaroundDays(5);
      setPackageTier('standard');
      setStatus('active');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 2) {
      setError('Title must be at least 2 characters long.');
      return;
    }

    const cleanedDeliverables = deliverables.map((d) => d.trim()).filter((d) => d.length > 0);
    if (cleanedDeliverables.length === 0) {
      setError('At least one deliverable item is required.');
      return;
    }

    if (price < 5) {
      setError('Service price must be at least ₹5.');
      return;
    }

    if (turnaroundDays < 1 || turnaroundDays > 365) {
      setError('Turnaround time must be between 1 and 365 days.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        title: title.trim(),
        category,
        description: description.trim(),
        deliverables: cleanedDeliverables,
        revisions: Number(revisions),
        price: Number(price),
        currency: currency.toUpperCase(),
        turnaroundDays: Number(turnaroundDays),
        packageTier,
        status
      });
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to save service.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              {initialData ? 'Edit Service Package' : 'Create Service Package'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Define fixed-scope creative deliverables, package pricing, and turnaround expectations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-2 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Service Package Title *"
              placeholder="e.g. 4K Generative Trailer Package"
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Service Domain
              </label>
              <select
                value={category}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tier & Price & Turnaround */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Tier Level
              </label>
              <select
                value={packageTier}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setPackageTier(e.target.value as 'starter' | 'standard' | 'premium')}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="starter">Starter</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <Input
              label="Price (₹ INR) *"
              type="number"
              min={5}
              value={price}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value))}
              required
            />

            <Input
              label="Turnaround (Days) *"
              type="number"
              min={1}
              max={365}
              value={turnaroundDays}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTurnaroundDays(Number(e.target.value))}
              required
            />
          </div>

          {/* Revisions & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Included Revision Rounds"
              type="number"
              min={0}
              max={20}
              value={revisions}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setRevisions(Number(e.target.value))}
              helperText="e.g. 2 major revision cycles"
            />
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
                Listing Status
              </label>
              <select
                value={status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="active">Active (Visible on public profile)</option>
                <option value="inactive">Inactive (Hidden)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
              Service Scope & Deliverable Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Detail what is included, resolution, workflow steps, and what the client needs to provide..."
              className="w-full bg-surface-elevated border border-border rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
            />
          </div>

          {/* Deliverables checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase font-mono">
                Key Deliverables List *
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
                    placeholder={`e.g. ${idx === 0 ? '4x 4K Master Render Files' : 'Full commercial broadcast license'}`}
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

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/60">
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={loading}>
              {initialData ? 'Save Package' : 'Publish Service Package'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
