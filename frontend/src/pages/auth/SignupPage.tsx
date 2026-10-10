import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { UserRole } from '../../types';
import { extractErrorMessage } from '../../services/api';
import { Sparkles, Lock, Mail, User, Briefcase, Check, AlertCircle } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = (searchParams.get('role') as UserRole) || 'creator';
  const [role, setRole] = useState<'creator' | 'brand'>(initialRole === 'brand' ? 'brand' : 'creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!acceptTerms) {
      setErrorMessage('Please accept the Terms of Service & Privacy Policy.');
      return;
    }

    setIsLoading(true);

    try {
      const user = await register({
        name,
        email,
        password,
        confirmPassword,
        role
      });

      // Redirect directly to onboarding wizard for their chosen role
      if (user.role === 'creator') {
        navigate('/onboarding/creator', { replace: true });
      } else {
        navigate('/onboarding/brand', { replace: true });
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to create account.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <Card variant="glass" className="w-full max-w-lg p-8 border-border/80 shadow-card-dark">
        <div className="text-center space-y-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center mx-auto shadow-glow-sm">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary font-display">
            Join Kampus.VC
          </h2>
          <p className="text-xs text-text-secondary">
            Select your account role to begin your creative journey.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('creator')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              role === 'creator'
                ? 'bg-surface-elevated border-accent text-text-primary shadow-glow-sm'
                : 'bg-surface border-border text-text-secondary hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <User className={`w-5 h-5 ${role === 'creator' ? 'text-accent' : 'text-text-muted'}`} />
              {role === 'creator' && <Check className="w-4 h-4 text-accent" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">Creator</h4>
              <p className="text-[11px] text-text-muted">Showcase work & receive briefs</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole('brand')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              role === 'brand'
                ? 'bg-surface-elevated border-accent text-text-primary shadow-glow-sm'
                : 'bg-surface border-border text-text-secondary hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Briefcase className={`w-5 h-5 ${role === 'brand' ? 'text-accent' : 'text-text-muted'}`} />
              {role === 'brand' && <Check className="w-4 h-4 text-accent" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">Brand / Agency</h4>
              <p className="text-[11px] text-text-muted">Post briefs & hire talent</p>
            </div>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
              {role === 'creator' ? 'Display Name / Alias' : 'Company or Brand Name'}
            </label>
            <input
              type="text"
              required
              placeholder={role === 'creator' ? 'e.g. Alex Rivera' : 'e.g. Acme Studios'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 rounded bg-surface border-border text-accent focus:ring-accent"
            />
            <label htmlFor="terms" className="text-xs text-text-muted leading-relaxed">
              I agree to the Kampus.VC Terms of Service and Privacy Guidelines for digital creative collaboration.
            </label>
          </div>

          <Button type="submit" variant="glow" size="lg" className="w-full mt-2" isLoading={isLoading}>
            Create Account as {role === 'creator' ? 'Creator' : 'Brand'}
          </Button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative px-3 bg-surface text-[11px] uppercase tracking-wider text-text-muted font-mono">
            Or register with
          </span>
        </div>

        <GoogleSignInButton
          role={role}
          onSuccess={() => {
            if (role === 'creator') {
              navigate('/onboarding/creator', { replace: true });
            } else {
              navigate('/onboarding/brand', { replace: true });
            }
          }}
        />

        <div className="mt-6 pt-6 border-t border-border/60 text-center text-xs text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};
