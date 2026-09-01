import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { ROLE_HOME } from '../../../constants/roles';
import { getErrorMessage } from '../../../api/client';
import { signInWithGooglePopup } from '../../../lib/firebase';

// Google sign-in priority:
//  1. VITE_GOOGLE_CLIENT_ID set → official Google Identity Services button.
//  2. Otherwise → REAL Firebase Auth Google popup (CIRO Firebase project).
//  3. Dev-only demo login stays available as a small fallback link.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
}

function GoogleG() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function friendlyFirebaseError(err) {
  const code = err?.code || '';
  if (code.includes('configuration-not-found') || code.includes('operation-not-allowed')) {
    return 'Google provider is not enabled in the Firebase console yet — use the demo login below for now.';
  }
  if (code.includes('popup-blocked')) return 'Popup blocked — allow popups for this site and try again.';
  if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) return '';
  if (code.includes('network-request-failed')) return 'Network error while contacting Google — try again.';
  return err?.message || 'Google sign-in failed';
}

export default function GoogleSignInButton({ onError }) {
  const navigate = useNavigate();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const boxRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const finish = (user) => navigate(ROLE_HOME[user.role] || '/', { replace: true });

  // GIS official button only when a dedicated OAuth client id is configured.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await loadGis();
        if (cancelled || !boxRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setBusy(true);
            try {
              finish(await loginWithGoogle({ idToken: response.credential }));
            } catch (err) {
              onError(getErrorMessage(err, 'Google login failed'));
            } finally {
              setBusy(false);
            }
          }
        });
        window.google.accounts.id.renderButton(boxRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 300
        });
      } catch {
        onError('Could not load Google Sign-In — check your connection.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real Firebase Google popup (default when no GIS client id).
  const realGoogle = async () => {
    setBusy(true);
    onError('');
    try {
      const { idToken } = await signInWithGooglePopup();
      finish(await loginWithGoogle({ idToken }));
    } catch (err) {
      const msg = friendlyFirebaseError(err);
      if (msg) onError(msg);
    } finally {
      setBusy(false);
    }
  };

  const demoGoogle = async () => {
    setBusy(true);
    onError('');
    try {
      finish(await loginWithGoogle({ demo: true }));
    } catch (err) {
      onError(getErrorMessage(err, 'Demo Google login unavailable'));
    } finally {
      setBusy(false);
    }
  };

  if (GOOGLE_CLIENT_ID) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div ref={boxRef} />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-2">
      <button
        type="button"
        onClick={realGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-surface active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-ink-soft" /> : <GoogleG />}
        Continue with Google
      </button>
      <button
        type="button"
        onClick={demoGoogle}
        disabled={busy}
        className="text-[11px] font-medium text-ink-soft/70 underline-offset-2 transition hover:text-ink-soft hover:underline disabled:opacity-50"
      >
        Use demo Google login (dev only)
      </button>
    </div>
  );
}
