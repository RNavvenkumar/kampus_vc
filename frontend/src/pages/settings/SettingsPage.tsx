import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { extractErrorMessage } from '../../services/api';
import { Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, creatorProfile, brandProfile, updateCreatorProfile, updateBrandProfile, changePassword } =
    useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Profile edit state
  const [creatorAvatar, setCreatorAvatar] = useState(creatorProfile?.avatarUrl || user?.avatar || '');
  const [creatorHeadline, setCreatorHeadline] = useState(creatorProfile?.headline || '');
  const [creatorBio, setCreatorBio] = useState(creatorProfile?.biography || '');
  const [creatorRate, setCreatorRate] = useState<number | undefined>(creatorProfile?.hourlyRate);
  const [creatorAvailability, setCreatorAvailability] = useState(creatorProfile?.availability || 'available');

  const [brandCompanyName, setBrandCompanyName] = useState(brandProfile?.companyName || '');
  const [brandDescription, setBrandDescription] = useState(brandProfile?.description || '');
  const [brandWebsite, setBrandWebsite] = useState(brandProfile?.website || '');

  const [profileStatus, setProfileStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({ error: 'New passwords do not match.' });
      return;
    }

    setIsPasswordLoading(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setPasswordStatus({ success: 'Password changed successfully. All other sessions revoked.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordStatus({ error: extractErrorMessage(err, 'Failed to update password.') });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setIsProfileLoading(true);

    try {
      if (user?.role === 'creator') {
        await updateCreatorProfile({
          avatarUrl: creatorAvatar || undefined,
          headline: creatorHeadline,
          biography: creatorBio,
          hourlyRate: creatorRate ? Number(creatorRate) : undefined,
          availability: creatorAvailability as any
        });
      } else if (user?.role === 'brand') {
        await updateBrandProfile({
          companyName: brandCompanyName,
          description: brandDescription,
          website: brandWebsite || undefined
        });
      }
      setProfileStatus({ success: 'Profile updated and synced to database successfully.' });
    } catch (err) {
      setProfileStatus({ error: extractErrorMessage(err, 'Failed to update profile.') });
    } finally {
      setIsProfileLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div>
        <Badge variant="cyan" size="md" className="mb-2">
          Account Settings
        </Badge>
        <h1 className="text-3xl font-extrabold text-text-primary font-display">
          Profile & Security Management
        </h1>
        <p className="text-sm text-text-secondary">
          Manage your account profile, credentials, and active security sessions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/80 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <User className="w-4 h-4" /> Profile Information
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Lock className="w-4 h-4" /> Password & Security
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <Card variant="glass" className="p-8 border-border">
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            {profileStatus?.success && (
              <div className="p-3.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{profileStatus.success}</span>
              </div>
            )}
            {profileStatus?.error && (
              <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{profileStatus.error}</span>
              </div>
            )}

            {user?.role === 'creator' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 uppercase font-mono">
                    Profile Picture / Avatar URL
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-surface-elevated border-2 border-accent/40 flex-shrink-0">
                      <img
                        src={creatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="url"
                        value={creatorAvatar}
                        onChange={(e) => setCreatorAvatar(e.target.value)}
                        placeholder="https://images.unsplash.com/... or image link"
                        className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={creatorHeadline}
                    onChange={(e) => setCreatorHeadline(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                      Hourly Rate (₹ INR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={creatorRate || ''}
                      onChange={(e) => setCreatorRate(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                      Availability
                    </label>
                    <select
                      value={creatorAvailability}
                      onChange={(e) => setCreatorAvailability(e.target.value as 'available' | 'limited' | 'busy')}
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="available">Available for Work</option>
                      <option value="limited">Limited</option>
                      <option value="busy">Busy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Artist Biography
                  </label>
                  <textarea
                    rows={4}
                    value={creatorBio}
                    onChange={(e) => setCreatorBio(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={brandCompanyName}
                    onChange={(e) => setBrandCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={brandWebsite}
                    onChange={(e) => setBrandWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                    Company Overview
                  </label>
                  <textarea
                    rows={4}
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </>
            )}

            <Button type="submit" variant="primary" size="md" isLoading={isProfileLoading}>
              Save Profile Changes
            </Button>
          </form>
        </Card>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <Card variant="glass" className="p-8 border-border">
          <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg">
            <h3 className="text-lg font-bold text-text-primary mb-1">Update Account Password</h3>
            <p className="text-xs text-text-secondary mb-4">
              Updating your password will automatically invalidate all other active browser sessions for your security.
            </p>

            {passwordStatus?.success && (
              <div className="p-3.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{passwordStatus.success}</span>
              </div>
            )}
            {passwordStatus?.error && (
              <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{passwordStatus.error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <Button type="submit" variant="primary" size="md" isLoading={isPasswordLoading}>
              Update Password
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
