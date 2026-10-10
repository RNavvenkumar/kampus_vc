import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { extractErrorMessage } from '../../services/api';
import { Sparkles, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = await login({ email, password });
      if (from) {
        navigate(from, { replace: true });
      } else if (user.onboardingStatus !== 'completed') {
        navigate(user.role === 'creator' ? '/onboarding/creator' : '/onboarding/brand', { replace: true });
      } else {
        navigate(user.role === 'creator' ? '/creator/dashboard' : '/brand/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(extractErrorMessage(err, 'Failed to sign in. Please verify your credentials.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <Card variant="glass" className="w-full max-w-md p-8 border-border/80 shadow-card-dark">
        <div className="text-center space-y-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center mx-auto shadow-glow-sm">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary font-display">
            Welcome back to Kampus.VC
          </h2>
          <p className="text-xs text-text-secondary">
            Sign in to access your creative workspace, briefs, and projects.
          </p>
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

          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1 uppercase font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={isLoading}>
            Sign In with Email
          </Button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative px-3 bg-surface text-[11px] uppercase tracking-wider text-text-muted font-mono">
            Or continue with
          </span>
        </div>

        <GoogleSignInButton
          role="creator"
          onSuccess={() => {
            if (from) {
              navigate(from, { replace: true });
            } else {
              navigate('/creator/dashboard', { replace: true });
            }
          }}
        />

        <div className="mt-6 pt-6 border-t border-border/60 text-center text-xs text-text-muted">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-accent hover:underline font-semibold">
            Create an Account
          </Link>
        </div>
      </Card>
    </div>
  );
};
