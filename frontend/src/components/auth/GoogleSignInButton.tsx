import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../services/api';
import { AlertCircle, Loader2 } from 'lucide-react';

interface GoogleSignInButtonProps {
  role?: 'creator' | 'brand';
  onSuccess?: () => void;
  onError?: (err: string) => void;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  role = 'creator',
  onSuccess,
  onError,
  className = ''
}) => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const buttonDivRef = useRef<HTMLDivElement>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '846122362882-ejed3dkk7vcf750mde77fhbmasm9ttl5.apps.googleusercontent.com';

  const handleCredentialResponse = async (response: { credential?: string }) => {
    if (!response.credential) {
      const err = 'No Google credential token returned.';
      setLocalError(err);
      onError?.(err);
      return;
    }

    setLoading(true);
    setLocalError(null);
    try {
      await loginWithGoogle(response.credential, role);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Google authentication failed. Please try again.');
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;

    // Load Google Identity Services script
    const scriptId = 'google-identity-services-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initializeGoogleButton = () => {
      if (window.google?.accounts?.id && buttonDivRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        buttonDivRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonDivRef.current, {
          theme: 'filled_black',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 380,
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleButton;
      document.body.appendChild(script);
    } else {
      initializeGoogleButton();
    }
  }, [clientId, role]);

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {localError && (
        <div className="w-full mb-3 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {loading ? (
        <div className="w-full py-3 px-4 rounded-xl bg-surface-elevated border border-border flex items-center justify-center gap-3 text-text-muted text-sm animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span>Verifying Google account...</span>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          {/* Native Google GIS button render target */}
          <div ref={buttonDivRef} className="w-full flex justify-center min-h-[44px]" />
        </div>
      )}
    </div>
  );
};
