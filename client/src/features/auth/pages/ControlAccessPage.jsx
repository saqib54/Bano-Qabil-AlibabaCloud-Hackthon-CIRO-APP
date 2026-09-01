import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, LogIn, ShieldCheck, Eye, EyeOff, ArrowLeft, Lock } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { ROLE_HOME } from '../../../constants/roles';
import { getErrorMessage } from '../../../api/client';

/**
 * Official Access portal — hidden from the public citizen app.
 * Reachable only via /control. Admins and responders sign in here.
 */
export default function ControlAccessPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm();

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const user = await login(values.email, values.password);
      if (user.role === 'PUBLIC') {
        // Citizens must not use this portal — sign them back out
        await useAuthStore.getState().logout();
        setServerError('This portal is for command staff and responders only. Please use the citizen app.');
        return;
      }
      navigate(ROLE_HOME[user.role] || '/login', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Access denied. Please check your credentials.'));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-10">
      {/* Animated aurora background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand/30 blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-danger/20 blur-[120px] animate-pulse-slow [animation-delay:1.5s]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px] animate-pulse-slow [animation-delay:0.7s]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-glow-brand backdrop-blur-xl">
            <Lock className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Official Access</h1>
          <p className="mt-1 text-xs text-slate-400">
            CIRO Command Center · Restricted to authorized personnel
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-brand">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Secured channel</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lift backdrop-blur-xl sm:p-8">
          {serverError && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-rose-300">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="control-email">
                Official email
              </label>
              <input
                id="control-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="input border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-brand focus:ring-brand/30"
                placeholder="official@ciro.gov.pk"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="control-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="control-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input border-white/10 bg-white/5 pr-11 text-white placeholder:text-slate-500 focus:border-brand focus:ring-brand/30"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 tap-target rounded-lg p-2 text-slate-400 transition hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary w-full rounded-2xl border-0 bg-brand py-3.5 text-base shadow-glow-brand transition hover:bg-brand-dark active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Authenticate
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to citizen app
          </Link>
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-600">
          Authorized access only · All authentication attempts are logged and audited
        </p>
      </div>
    </div>
  );
}
