import React, { useState, useEffect, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ServiceItem } from '../../types';
import {
  getMyServices,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getCreatorAvailability,
  updateCreatorAvailability,
  extractErrorMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ServiceEditorModal } from '../../components/services/ServiceEditorModal';
import {
  Plus,
  Package,
  Clock,
  RotateCcw,
  Check,
  Power,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

export const ServiceCatalogPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Availability State
  const [availability, setAvailability] = useState<'available' | 'limited' | 'busy'>('available');
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [availableFromDate, setAvailableFromDate] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [servicesRes, availRes] = await Promise.all([
        getMyServices(),
        getCreatorAvailability()
      ]);
      setServices(servicesRes.services || []);
      if (availRes) {
        setAvailability(availRes.availability || 'available');
        setAvailabilityNote(availRes.availabilityNote || '');
        setAvailableFromDate(availRes.availableFromDate ? availRes.availableFromDate.substring(0, 10) : '');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load services and availability'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveService = async (data: Partial<ServiceItem>) => {
    if (editingService) {
      const updated = await updateService(editingService.id, data);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSuccessMessage('Service package updated successfully.');
    } else {
      const created = await createService(data);
      setServices((prev) => [...prev, created]);
      setSuccessMessage('New service package added to your catalog.');
    }
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteService(serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      setDeletingServiceId(null);
      setSuccessMessage('Service package removed.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete service'));
    }
  };

  const handleToggleStatus = async (serviceId: string) => {
    try {
      const updated = await toggleServiceStatus(serviceId);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSuccessMessage(`Service listing status changed to ${updated.status}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to toggle service status'));
    }
  };

  const handleUpdateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingAvailability(true);
      await updateCreatorAvailability({
        availability,
        availabilityNote: availabilityNote.trim() || undefined,
        availableFromDate: availableFromDate || null
      });
      setSuccessMessage('Availability status updated and synced to your public profile.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update availability'));
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/creator/dashboard" className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span className="text-text-muted">/</span>
            <Badge variant="cyan" size="sm">
              Creator Studio
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            Services & Availability
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Package your creative workflows into turnkey fixed-price offerings and set client availability schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
          >
            Create Service Package
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-status-success/15 border border-status-success/40 text-status-success text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs hover:underline font-mono">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-status-error/15 border border-status-error/40 text-status-error text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Availability Settings Card */}
      <Card variant="glass" className="p-6 sm:p-8 border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" /> Work Availability & Booking Calendar
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Broadcast your real-time booking bandwidth to incoming brand inquiries.
            </p>
          </div>

          <Badge
            variant={
              availability === 'available'
                ? 'success'
                : availability === 'limited'
                ? 'warning'
                : 'error'
            }
            size="md"
          >
            {availability === 'available'
              ? '● Available for Work'
              : availability === 'limited'
              ? '◐ Limited Bandwidth'
              : '○ Fully Booked'}
          </Badge>
        </div>

        <form onSubmit={handleUpdateAvailability} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase font-mono mb-1.5">
              Current Status
            </label>
            <select
              value={availability}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setAvailability(e.target.value as 'available' | 'limited' | 'busy')}
              className="w-full bg-surface-elevated border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="available">Available (Taking new projects)</option>
              <option value="limited">Limited (Select collaborations only)</option>
              <option value="busy">Busy / Fully Booked</option>
            </select>
          </div>

          <div>
            <Input
              label="Available Next From (Optional)"
              type="date"
              value={availableFromDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAvailableFromDate(e.target.value)}
              helperText="Estimated start date for new briefs"
            />
          </div>

          <div>
            <Input
              label="Availability Note"
              placeholder="e.g. Taking 1 commercial project in November"
              value={availabilityNote}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAvailabilityNote(e.target.value)}
              helperText="Visible on public creator profile"
            />
          </div>

          <div className="md:col-span-3 flex justify-end pt-2 border-t border-border/40">
            <Button type="submit" variant="secondary" size="sm" isLoading={savingAvailability}>
              Save Availability Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* Services Section Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary font-display flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" /> Packaged Offerings ({services.length})
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Active packages will be displayed in your public portfolio shopfront.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} variant="elevated" className="p-6 space-y-4 animate-pulse border-border">
              <div className="h-5 bg-surface-muted rounded w-1/3" />
              <div className="h-8 bg-surface-muted rounded w-2/3" />
              <div className="h-20 bg-surface-muted rounded" />
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center border-border space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-accent">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary font-display">No service packages yet</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Create structured service packages so brands can understand your pricing tiers and scope at a glance.
          </p>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
          >
            Create Your First Service
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card
              key={service.id}
              variant="elevated"
              className={`p-6 border-border flex flex-col justify-between transition-all duration-300 hover:border-accent/40 ${
                service.status === 'inactive' ? 'opacity-70 bg-surface-muted/50' : ''
              }`}
            >
              <div className="space-y-4">
                {/* Header tier and status */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-surface-elevated text-accent border border-border">
                    {service.packageTier} Package
                  </span>
                  <Badge variant={service.status === 'active' ? 'success' : 'default'} size="sm">
                    {service.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Title & Price */}
                <div>
                  <h3 className="text-xl font-bold text-text-primary font-display mb-1">
                    {service.title}
                  </h3>
                  <span className="text-xs text-text-muted">{service.category}</span>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-text-primary font-display">
                      ₹{service.price.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono text-text-muted">{service.currency === 'USD' ? 'INR' : service.currency}</span>
                  </div>
                </div>

                {/* Turnaround & Revisions */}
                <div className="grid grid-cols-2 gap-2 py-3 border-y border-border/60 text-xs">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Clock className="w-4 h-4 text-accent" />
                    <span>{service.turnaroundDays} Days Delivery</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <RotateCcw className="w-4 h-4 text-accent" />
                    <span>{service.revisions} Revisions</span>
                  </div>
                </div>

                {/* Description */}
                {service.description && (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {service.description}
                  </p>
                )}

                {/* Deliverables List */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-semibold uppercase text-text-muted font-mono block">
                    Deliverables:
                  </span>
                  {service.deliverables.map((deliv, dIdx) => (
                    <div key={dIdx} className="flex items-start gap-2 text-xs text-text-secondary">
                      <Check className="w-3.5 h-3.5 text-status-success mt-0.5 flex-shrink-0" />
                      <span>{deliv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-6 mt-6 border-t border-border/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(service.id)}
                  className={`text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-colors ${
                    service.status === 'active'
                      ? 'bg-surface-elevated text-text-muted hover:text-text-primary border-border'
                      : 'bg-status-success/15 text-status-success border-status-success/40'
                  }`}
                  title={service.status === 'active' ? 'Deactivate listing' : 'Activate listing'}
                >
                  <Power className="w-3.5 h-3.5" />
                  {service.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(service);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-surface-elevated transition-colors flex items-center gap-1 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingServiceId(service.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-surface-elevated transition-colors"
                    title="Delete service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingServiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <Card variant="elevated" className="w-full max-w-md p-6 border-status-error/40 space-y-4">
            <h3 className="text-lg font-bold text-text-primary font-display flex items-center gap-2 text-status-error">
              <AlertCircle className="w-5 h-5" /> Confirm Deletion
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to delete this service package? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <Button variant="secondary" size="sm" onClick={() => setDeletingServiceId(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteService(deletingServiceId)}>
                Yes, Delete Service
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Editor Modal */}
      <ServiceEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveService}
        initialData={editingService}
      />
    </div>
  );
};
