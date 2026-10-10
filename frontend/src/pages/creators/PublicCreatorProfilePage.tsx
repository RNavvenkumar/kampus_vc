import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CreatorProfile, PortfolioItem } from '../../types';
import { getPublicCreatorByUsernameOrId, DEMO_CREATORS, extractErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Sparkles,
  Layers,
  Package,
  Clock,
  RotateCcw,
  Check,
  ExternalLink,
  Globe,
  MapPin,
  Twitter,
  Instagram,
  Github,
  Linkedin,
  ArrowLeft,
  X,
  Star,
  AlertCircle,
  Play,
  Video,
  Copy,
  MessageSquare
} from 'lucide-react';

const isVideoMedia = (url?: string, type?: string) => {
  if (type === 'video') return true;
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/');
};

import { DirectChatModal } from '../../components/chat/DirectChatModal';

export const PublicCreatorProfilePage: React.FC = () => {
  const { usernameOrId } = useParams<{ usernameOrId: string }>();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Portfolio item preview modal
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [copiedVideo, setCopiedVideo] = useState(false);

  // Real-Time Direct Chat & Inquiry Modal
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<{
    serviceTitle?: string;
    packageTier?: string;
    price?: number;
    currency?: string;
  } | undefined>(undefined);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!usernameOrId) return;

      try {
        setLoading(true);
        setError(null);

        // First check demo creators list
        const demo = DEMO_CREATORS.find(
          (c) =>
            c.username?.toLowerCase() === usernameOrId.toLowerCase() ||
            c.id === usernameOrId ||
            c.displayName.toLowerCase().replace(/\s+/g, '') === usernameOrId.toLowerCase()
        );

        if (demo) {
          setProfile(demo);
          setLoading(false);
          return;
        }

        // Fetch from live API
        const data = await getPublicCreatorByUsernameOrId(usernameOrId);
        setProfile(data);
      } catch (err) {
        // Fallback check demo creators
        const demo = DEMO_CREATORS.find(
          (c) =>
            c.username?.toLowerCase() === usernameOrId.toLowerCase() ||
            c.id === usernameOrId
        );
        if (demo) {
          setProfile(demo);
        } else {
          setError(extractErrorMessage(err, 'Creator profile not found or is set to private.'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [usernameOrId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-6 animate-pulse">
        <div className="w-28 h-28 rounded-full bg-surface-muted mx-auto" />
        <div className="h-8 bg-surface-muted rounded w-1/3 mx-auto" />
        <div className="h-4 bg-surface-muted rounded w-1/2 mx-auto" />
        <div className="h-64 bg-surface-muted rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-status-error">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary font-display">Creator Profile Not Found</h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          {error || 'This creator profile may be unlisted, set to private, or does not exist.'}
        </p>
        <Link to="/explore">
          <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Creator Directory
          </Button>
        </Link>
      </div>
    );
  }

  const publicPortfolio = profile.portfolioItems || [];
  const publicServices = (profile.services || []).filter((s) => s.status === 'active');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fadeIn">
      {/* Back Navigation */}
      <div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Creator Directory
        </Link>
      </div>

      {/* Hero Profile Banner */}
      <Card variant="glass" className="p-6 sm:p-10 border-border overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Avatar & Identifiers */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <img
                src={
                  profile.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
                }
                alt={profile.displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-border shadow-2xl"
              />
              {profile.isDemonstration && (
                <div className="absolute -bottom-2 -right-2">
                  <Badge variant="cyan" size="sm">
                    Demo
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary font-display">
                  {profile.displayName}
                </h1>
                {profile.username && (
                  <span className="text-xs font-mono text-text-muted">@{profile.username}</span>
                )}
                {profile.verifiedStatus === 'featured' && (
                  <Badge variant="cyan" size="sm">
                    ★ Featured
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInquiry(undefined);
                    setIsChatOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-sm"
                  title="Message Creator"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message</span>
                </button>
              </div>

              <p className="text-sm sm:text-base text-text-secondary max-w-2xl leading-relaxed">
                {profile.headline || 'Digital Creator & Generative Visual Artist'}
              </p>

              {/* Meta details */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-text-muted">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-accent" /> {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-accent" /> Portfolio Link
                  </a>
                )}
                {profile.hourlyRate && (
                  <span className="font-semibold text-text-primary">
                    Starting at ₹{profile.hourlyRate.toLocaleString()}/hr
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Availability & Booking Box */}
          <div className="flex flex-col items-start sm:items-end gap-3 w-full md:w-auto p-4 rounded-xl bg-surface-elevated/60 border border-border">
            <Badge
              variant={
                profile.availability === 'available'
                  ? 'success'
                  : profile.availability === 'limited'
                  ? 'warning'
                  : 'error'
              }
              size="md"
            >
              {profile.availability === 'available'
                ? '● Available for Work'
                : profile.availability === 'limited'
                ? '◐ Limited Bandwidth'
                : '○ Fully Booked'}
            </Badge>

            {profile.availabilityNote && (
              <p className="text-xs text-text-muted text-left sm:text-right max-w-xs">
                "{profile.availabilityNote}"
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<MessageSquare className="w-4 h-4 text-emerald-300" />}
                onClick={() => {
                  setSelectedInquiry(undefined);
                  setIsChatOpen(true);
                }}
                className="flex-1 sm:flex-initial shadow-lg shadow-emerald-500/15 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                Message Creator
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedInquiry(undefined);
                  setIsChatOpen(true);
                }}
                className="flex-1 sm:flex-initial"
              >
                Inquire Project
              </Button>
            </div>
          </div>
        </div>

        {/* Social Links */}
        {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-border/60 text-text-muted">
            {profile.socialLinks.twitter && (
              <a
                href={profile.socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {profile.socialLinks.instagram && (
              <a
                href={profile.socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {profile.socialLinks.github && (
              <a
                href={profile.socialLinks.github}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
            )}
            {profile.socialLinks.linkedin && (
              <a
                href={profile.socialLinks.linkedin}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </Card>

      {/* Biography & Creative DNA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card variant="glass" className="p-6 sm:p-8 lg:col-span-2 border-border space-y-4">
          <h2 className="text-xl font-bold text-text-primary font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Creative Philosophy & Bio
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {profile.biography ||
              'A multidisciplinary creator pushing the frontiers of digital aesthetics, neural generative workflows, and interactive brand experiences.'}
          </p>
        </Card>

        <Card variant="glass" className="p-6 sm:p-8 border-border space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted font-mono">
            Specialties & Tools
          </h3>

          <div>
            <span className="text-xs text-text-muted block mb-2 font-semibold">Specialties:</span>
            <div className="flex flex-wrap gap-1.5">
              {profile.specialties && profile.specialties.length > 0 ? (
                profile.specialties.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-xs bg-surface-elevated text-text-primary border border-border"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-xs text-text-muted">No specialties listed.</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs text-text-muted block mb-2 font-semibold">Software & Models:</span>
            <div className="flex flex-wrap gap-1.5">
              {profile.creativeTools && profile.creativeTools.length > 0 ? (
                profile.creativeTools.map((t, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-muted text-text-secondary"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-text-muted">No tools listed.</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Portfolio Showcase Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-display flex items-center gap-2">
              <Layers className="w-6 h-6 text-accent" /> Portfolio Showcase ({publicPortfolio.length})
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Curated artwork, 3D renderings, synthetic video loops, and case studies.
            </p>
          </div>
        </div>

        {publicPortfolio.length === 0 ? (
          <Card variant="elevated" className="p-12 text-center border-border">
            <p className="text-sm text-text-muted">This creator has not published any public portfolio assets yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicPortfolio.map((item) => (
              <Card
                key={item.id}
                variant="elevated"
                onClick={() => setSelectedItem(item)}
                className="group cursor-pointer overflow-hidden border-border hover:border-accent/50 transition-all duration-300"
              >
                <div className="relative h-60 w-full bg-surface-muted overflow-hidden">
                  {isVideoMedia(item.mediaUrl, item.mediaType) ? (
                    item.thumbnailUrl ? (
                      <div className="relative w-full h-full">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-accent/90 text-black flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <video
                          src={item.mediaUrl}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          muted
                          preload="metadata"
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-accent/90 text-black flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                  )}

                  {/* Category & Featured */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="cyan" size="sm">
                      {item.category}
                    </Badge>
                    {item.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-black flex items-center gap-1">
                        <Star className="w-3 h-3 fill-black" /> Featured
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-text-primary font-display line-clamp-1 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {item.clientName && (
                    <span className="text-[11px] text-text-muted block">
                      Client: <span className="text-text-primary">{item.clientName}</span>
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Services Catalog */}
      {publicServices.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-border/60">
          <div>
            <h2 className="text-2xl font-bold text-text-primary font-display flex items-center gap-2">
              <Package className="w-6 h-6 text-accent" /> Available Service Packages ({publicServices.length})
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Fixed-price turnkey deliverables available for booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicServices.map((service) => (
              <Card
                key={service.id}
                variant="elevated"
                className="p-6 border-border flex flex-col justify-between hover:border-accent/40 transition-all space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase bg-surface-elevated text-accent border border-border">
                      {service.packageTier} Tier
                    </span>
                    <span className="text-xs text-text-muted">{service.category}</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-text-primary font-display mb-2">
                      {service.title}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-text-primary font-display">
                        ₹{service.price.toLocaleString()}
                      </span>
                      <span className="text-xs font-mono text-text-muted">{service.currency === 'USD' ? 'INR' : service.currency}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-3 border-y border-border/60 text-xs">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Clock className="w-4 h-4 text-accent" />
                      <span>{service.turnaroundDays} Days Turnaround</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <RotateCcw className="w-4 h-4 text-accent" />
                      <span>{service.revisions} Revisions</span>
                    </div>
                  </div>

                  {service.description && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {service.description}
                    </p>
                  )}

                  {/* Deliverables */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase text-text-muted font-mono block">
                      Includes:
                    </span>
                    {service.deliverables.map((deliv, dIdx) => (
                      <div key={dIdx} className="flex items-start gap-2 text-xs text-text-secondary">
                        <Check className="w-3.5 h-3.5 text-status-success mt-0.5 flex-shrink-0" />
                        <span>{deliv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setSelectedInquiry({
                      serviceTitle: service.title,
                      packageTier: service.packageTier,
                      price: service.price,
                      currency: service.currency || 'INR'
                    });
                    setIsChatOpen(true);
                  }}
                >
                  Book This Package
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Item Detail Lightbox Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-surface-card border border-border rounded-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Badge variant="cyan" size="sm">
                  {selectedItem.category}
                </Badge>
                <h3 className="text-lg font-bold text-text-primary font-display truncate max-w-md">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              {/* Media viewer */}
              <div className="w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-border/60">
                {isVideoMedia(selectedItem.mediaUrl, selectedItem.mediaType) ? (
                  <video
                    src={selectedItem.mediaUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[60vh] object-contain"
                  />
                ) : (
                  <img
                    src={selectedItem.mediaUrl}
                    alt={selectedItem.title}
                    className="w-full max-h-[60vh] object-contain"
                  />
                )}
              </div>

              {/* Direct Media Link & Quick Actions */}
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-xs text-text-muted truncate">
                    Media Link: <a href={selectedItem.mediaUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline font-mono">{selectedItem.mediaUrl}</a>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.mediaUrl);
                      setCopiedVideo(true);
                      setTimeout(() => setCopiedVideo(false), 2000);
                    }}
                  >
                    {copiedVideo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedVideo ? 'Link Copied!' : 'Copy Link'}
                  </Button>
                  <a
                    href={selectedItem.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-black hover:bg-accent/90 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Media
                  </a>
                </div>
              </div>

              {/* Description & Tools */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-text-muted font-mono mb-1">
                    About this Artwork
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {selectedItem.description || 'No detailed description provided.'}
                  </p>
                </div>

                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded text-xs bg-surface-muted text-text-secondary border border-border/40"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {selectedItem.projectUrl && (
                  <div className="pt-2">
                    <a
                      href={selectedItem.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-semibold"
                    >
                      <ExternalLink className="w-4 h-4" /> View Full Case Study & Project Notes
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Messaging & Inquiry Modal */}
      {profile && (
        <DirectChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          targetCreator={{
            id: profile.id,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            headline: profile.headline
          }}
          initialInquiry={selectedInquiry}
        />
      )}
    </div>
  );
};
