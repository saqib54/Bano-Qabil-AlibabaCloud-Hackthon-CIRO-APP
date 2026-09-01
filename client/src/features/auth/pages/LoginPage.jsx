import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, Mail, Eye, EyeOff, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { ROLE_HOME } from '../../../constants/roles';
import { getErrorMessage } from '../../../api/client';
import AuthBrandPanel from '../components/AuthBrandPanel';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OtpSignIn from '../components/OtpSignIn';
import PreferenceControls from '../../../components/common/PreferenceControls';

/** Login page — prototype design (§70): periwinkle canvas, navy arch hero. */
export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('password');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm();

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const user = await login(values.email, values.password);
      navigate(ROLE_HOME[user.role] || '/login', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Login failed. Please check your email and password.'));
    }
  };

  return (
    <div className="relative min-h-screen bg-peri lg:grid lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-10">
        <PreferenceControls variant="header" tone="light" />
      </div>
      <AuthBrandPanel variant="login" />

      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-8 sm:px-10 lg:min-h-screen">
        <div className="w-full max-w-md">
          <div className="card overflow-hidden border-white/60 shadow-lift">
            <div className="p-7 sm:p-9">
              <h2 className="text-2xl font-extrabold tracking-tight text-navy">Welcome back</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Sign in to report emergencies, track response and stay safe.
              </p>

              {serverError && (
                <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                  {serverError}
                </div>
              )}

              {mode === 'password' ? (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      className="input-icon"
                      placeholder="you@example.com"
                      {...register('email', { required: 'Email is required' })}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="password">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="input-icon pr-11"
                      placeholder="••••••••"
                      {...register('password', { required: 'Password is required' })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 tap-target rounded-lg p-2 text-ink-soft transition hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-base font-bold text-white shadow-glow-brand transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
                  {!isSubmitting && <ArrowRight className="h-5 w-5" />}
                </button>
              </form>
              ) : (
                <OtpSignIn onBack={() => setMode('password')} onError={setServerError} />
              )}

              {mode === 'password' && (
                <button
                  type="button"
                  onClick={() => setMode('otp')}
                  className="mt-4 w-full text-center text-xs font-semibold text-brand transition hover:underline"
                >
                  Email me a one-time code instead
                </button>
              )}

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">or</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <div className="mt-4 flex justify-center">
                <GoogleSignInButton onError={(m) => setServerError(m)} />
              </div>

              <p className="mt-6 text-center text-sm text-ink-soft">
                New to CIRO?{' '}
                <Link to="/register" className="font-bold text-brand hover:underline">
                  Create a citizen account
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 border-t border-line bg-surface/70 px-6 py-3">
              <ShieldCheck className="h-3 w-3 text-safe" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Encrypted · Rate-limited · Session auto-lock
              </span>
            </div>
          </div>

          {/* Subtle official access — no public hints */}
          <div className="mt-5 flex items-center justify-center">
            <Link
              to="/control"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-navy/30 transition hover:text-navy/60"
              title="Official access"
            >
              <Lock className="h-3 w-3" />
              Official access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
