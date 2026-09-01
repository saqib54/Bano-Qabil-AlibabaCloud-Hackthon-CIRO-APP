import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { ROLE_HOME } from '../../../constants/roles';
import { getErrorMessage } from '../../../api/client';

/**
 * Passwordless sign-in: email a 6-digit one-time code, verify, done.
 * New emails are auto-provisioned as citizen (PUBLIC) accounts.
 */
export default function OtpSignIn({ onBack, onError }) {
  const navigate = useNavigate();
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const cleanEmail = email.trim().toLowerCase();

  const sendCode = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setLocalError('Enter a valid email address first.');
      return;
    }
    setBusy(true);
    setLocalError('');
    onError('');
    try {
      const res = await requestOtp(cleanEmail);
      setSent(true);
      setDevCode(res.devCode || '');
    } catch (err) {
      setLocalError(getErrorMessage(err, 'Could not send the code — try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setLocalError('');
    onError('');
    try {
      const user = await loginWithOtp(cleanEmail, code.trim());
      navigate(ROLE_HOME[user.role] || '/', { replace: true });
    } catch (err) {
      setLocalError(getErrorMessage(err, 'Verification failed — check the code.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to password sign-in
      </button>

      {!sent ? (
        <form onSubmit={sendCode} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="otp-email">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
              <input
                id="otp-email"
                type="email"
                autoComplete="email"
                className="input-icon"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              We&apos;ll email you a 6-digit one-time sign-in code. New emails get a citizen account automatically.
            </p>
          </div>

          {localError && (
            <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              {localError}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-base font-bold text-white shadow-glow-brand transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
            Email me a code
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4" noValidate>
          <div>
            <p className="text-sm text-ink-soft">
              Code sent to <span className="font-semibold text-ink">{cleanEmail}</span>
            </p>
            {devCode && (
              <div className="mt-2 rounded-xl border border-brand/20 bg-brand/5 px-4 py-2.5 text-xs text-ink-soft">
                Dev mode (no SMTP configured) — your code is{' '}
                <span className="font-bold tracking-widest text-brand">{devCode}</span>
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="otp-code">6-digit code</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
              <input
                id="otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="input-icon tracking-[0.4em]"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          {localError && (
            <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              {localError}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-base font-bold text-white shadow-glow-brand transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
            Verify & sign in
          </button>

          <button
            type="button"
            onClick={() => { setSent(false); setCode(''); setDevCode(''); }}
            className="w-full text-center text-xs font-semibold text-ink-soft transition hover:text-ink"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
