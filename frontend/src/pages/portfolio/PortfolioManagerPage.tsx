import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PortfolioItem } from '../../types';
import {
  getMyPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  toggleFeaturedItem,
  reorderPortfolio,
  extractErrorMessage
} from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PortfolioEditorModal } from '../../components/portfolio/PortfolioEditorModal';
import {
  Plus,
  Layers,
  Star,
  Trash2,
  Edit2,
  ExternalLink,
  Eye,
  MoveUp,
  MoveDown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';

export const PortfolioManagerPage: React.FC = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  // Delete Confirmation State
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Category & Filter
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyPortfolio();
      setItems(res.items || []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load portfolio items'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSaveItem = async (data: Partial<PortfolioItem>) => {
    if (editingItem) {
      const updated = await updatePortfolioItem(editingItem.id, data);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccessMessage('Creative asset updated successfully.');
    } else {
      const created = await createPortfolioItem(data);
      setItems((prev) => [...prev, created]);
      setSuccessMessage('New creative asset added to your studio.');
    }
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deletePortfolioItem(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setDeletingItemId(null);
      setSuccessMessage('Portfolio asset deleted.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete portfolio asset'));
    }
  };

  const handleToggleFeature = async (itemId: string) => {
    try {
      const updated = await toggleFeaturedItem(itemId);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccessMessage(
        updated.isFeatured ? 'Item marked as featured on your public showcase.' : 'Featured badge removed.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update featured status'));
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setItems(newItems);

    try {
      await reorderPortfolio(newItems.map((it) => it.id));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save reorder'));
      fetchPortfolio(); // revert
    }
  };

  const categories = ['All', ...Array.from(new Set(items.map((it) => it.category).filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'All') return true;
    return item.category === activeCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/creator/dashboard" className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span className="text-text-muted">/</span>
            <Badge variant="cyan" size="sm">
              Portfolio Studio
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary font-display">
            Portfolio Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Curate your digital art, 3D models, video reels, and client case studies with rich metadata.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            Add Creative Asset
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
          <Button variant="outline" size="sm" onClick={fetchPortfolio}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Total Assets
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <Layers className="w-5 h-5 text-accent" />
            <span>{items.length} / 50</span>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Featured Highlights
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <Star className="w-5 h-5 text-status-warning" />
            <span>{items.filter((i) => i.isFeatured).length} Items</span>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 border-border">
          <span className="text-xs font-semibold uppercase text-text-muted font-mono block mb-1">
            Publicly Discoverable
          </span>
          <div className="flex items-center gap-2 text-2xl font-bold text-text-primary font-display">
            <Eye className="w-5 h-5 text-status-success" />
            <span>{items.filter((i) => i.visibility === 'public').length} Active</span>
          </div>
        </Card>
      </div>

      {/* Category Tabs */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-accent text-background-dark font-bold'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Portfolio Grid or Loading / Empty States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} variant="elevated" className="p-4 space-y-4 animate-pulse border-border">
              <div className="w-full h-48 bg-surface-muted rounded-xl" />
              <div className="h-4 bg-surface-muted rounded w-3/4" />
              <div className="h-3 bg-surface-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card variant="elevated" className="p-12 text-center border-border space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-accent">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-text-primary font-display">No portfolio assets yet</h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Upload your AI artworks, prompt results, 3D animations, and motion designs to be showcased to verified brands.
          </p>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            Create Your First Asset
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => (
            <Card
              key={item.id}
              variant="elevated"
              className="group overflow-hidden border-border hover:border-accent/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Media Preview Container */}
                <div className="relative w-full h-52 bg-surface-muted overflow-hidden">
                  <img
                    src={item.thumbnailUrl || item.mediaUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Overlay Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <Badge variant="cyan" size="sm">
                      {item.category}
                    </Badge>
                    {item.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-black flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3 fill-black" /> Featured
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => handleToggleFeature(item.id)}
                      title={item.isFeatured ? 'Unfeature' : 'Feature on profile'}
                      className={`p-1.5 rounded hover:bg-white/20 transition-colors ${
                        item.isFeatured ? 'text-amber-400' : 'text-text-muted hover:text-white'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                    {item.projectUrl && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-text-muted hover:text-white rounded hover:bg-white/20 transition-colors"
                        title="External Case Study"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Visibility Tag */}
                  <div className="absolute bottom-3 left-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold backdrop-blur-md border ${
                        item.visibility === 'public'
                          ? 'bg-status-success/20 border-status-success/40 text-status-success'
                          : item.visibility === 'unlisted'
                          ? 'bg-status-warning/20 border-status-warning/40 text-status-warning'
                          : 'bg-status-error/20 border-status-error/40 text-status-error'
                      }`}
                    >
                      {item.visibility.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-text-primary font-display line-clamp-1">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.slice(0, 3).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded text-[10px] bg-surface-muted text-text-muted border border-border/40"
                        >
                          #{tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] text-text-muted font-mono self-center">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Creative Tools */}
                  {item.creativeTools && item.creativeTools.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-text-muted font-mono">
                      <span>Tools:</span>
                      <span className="text-text-secondary truncate">{item.creativeTools.join(', ')}</span>
                    </div>
                  )}

                  {item.clientName && (
                    <div className="pt-1 text-[11px] text-text-muted">
                      Client: <span className="text-text-primary font-semibold">{item.clientName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Controls */}
              <div className="p-4 bg-surface-elevated/40 border-t border-border/60 flex items-center justify-between gap-2">
                {/* Reorder Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveOrder(idx, 'up')}
                    className="p-1.5 rounded hover:bg-surface-elevated text-text-muted hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move up"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMoveOrder(idx, 'down')}
                    className="p-1.5 rounded hover:bg-surface-elevated text-text-muted hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move down"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Edit and Delete */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-surface-elevated transition-colors flex items-center gap-1 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingItemId(item.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-status-error hover:bg-surface-elevated transition-colors"
                    title="Delete item"
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
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <Card variant="elevated" className="w-full max-w-md p-6 border-status-error/40 space-y-4">
            <h3 className="text-lg font-bold text-text-primary font-display flex items-center gap-2 text-status-error">
              <AlertCircle className="w-5 h-5" /> Confirm Deletion
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to delete this portfolio asset? This action will permanently remove it from your public creator profile.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <Button variant="secondary" size="sm" onClick={() => setDeletingItemId(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(deletingItemId)}>
                Yes, Delete Asset
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Editor Modal */}
      <PortfolioEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
      />
    </div>
  );
};
