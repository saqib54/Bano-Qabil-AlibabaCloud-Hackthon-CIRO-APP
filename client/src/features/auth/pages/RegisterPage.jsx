import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Loader2, UserPlus, Mail, Phone, Lock, Eye, EyeOff,
  ArrowRight, MapPin, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';
import { ROLE_HOME } from '../../../constants/roles';
import { getErrorMessage } from '../../../api/client';
import AuthBrandPanel from '../components/AuthBrandPanel';
import PreferenceControls from '../../../components/common/PreferenceControls';

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Other'
];

/** Simple 0–4 strength score for the live meter. */
function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score += 1;
  return score;
}

const STRENGTH_META = [
  { label: '', bar: 'bg-line', text: '' },
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-warn', text: 'text-warn' },
  { label: 'Good', bar: 'bg-brand', text: 'text-brand' },
  { label: 'Strong', bar: 'bg-safe', text: 'text-safe' }
];

/** Register page — prototype design (§70): 2-col, city, strength, consent. */
export default function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consented, setConsented] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm();

  const password = watch('password');
  const strength = STRENGTH_META[scorePassword(password)];

  const onSubmit = async (values) => {
    if (!consented) return;
    setServerError('');
    try {
      // City is a local preference (area alerts) — not part of the auth payload
      if (values.city) {
        try { localStorage.setItem('ciro-home-city', values.city); } catch {}
      }
      const user = await registerUser({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        confirmPassword: values.confirmPassword
      });
      navigate(ROLE_HOME[user.role] || '/login', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Registration failed. Please try again.'));
    }
  };

  return (
    <div className="relative min-h-screen bg-peri lg:grid lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-10">
        <PreferenceControls variant="header" tone="light" />
      </div>
      <AuthBrandPanel variant="register" />

      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-8 sm:px-10 lg:min-h-screen">
        <div className="w-full max-w-md">
          <div className="card overflow-hidden border-white/60 shadow-lift">
            <div className="p-7 sm:p-9">
              <h2 className="text-2xl font-extrabold tracking-tight text-navy">Create citizen account</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Public registration is for citizens only. Responder and command accounts
                are issued by the administration.
              </p>

              {serverError && (
                <div className="mt-4 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="label" htmlFor="fullName">Full name</label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      className="input-icon"
                      placeholder="Your full name"
                      {...register('fullName', { required: 'Full name is required', minLength: { value: 3, message: 'At least 3 characters' } })}
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-xs text-danger">{errors.fullName.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="reg-email">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                      <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        className="input-icon"
                        placeholder="you@example.com"
                        {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } })}
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="phone">Phone</label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                      <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        className="input-icon"
                        placeholder="+92 3XX XXXXXXX"
                        {...register('phone')}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="city">Home city</label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                    <select id="city" className="input-icon appearance-none" defaultValue="" {...register('city')}>
                      <option value="" disabled>Select your city (for area alerts)</option>
                      {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="reg-password">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input-icon pr-11"
                      placeholder="At least 8 characters, 1 uppercase, 1 number"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'At least 8 characters' },
                        pattern: { value: /^(?=.*[A-Z])(?=.*\d).+$/, message: 'Needs 1 uppercase letter and 1 number' }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 tap-target rounded-lg p-2 text-ink-soft transition hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Live strength meter */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            scorePassword(password) >= i ? strength.bar : 'bg-line'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`w-12 text-right text-[10px] font-bold ${strength.text}`}>{strength.label}</span>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="confirmPassword">Confirm password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input-icon"
                      placeholder="Repeat your password"
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) => value === password || 'Passwords do not match'
                      })}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Consent */}
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-peri-soft px-4 py-3">
                  <input
                    type="checkbox"
                    className="proto-check mt-0.5"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                  />
                  <span className="text-xs leading-relaxed text-navy/80">
                    I agree to the <span className="font-bold text-brand">Terms of Service</span> and{' '}
                    <span className="font-bold text-brand">Privacy Policy</span>. My location is used
                    only during emergencies, and every AI decision is audited and human-approved.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || !consented}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-base font-bold text-white shadow-glow-brand transition hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create account'}
                  {!isSubmitting && <ArrowRight className="h-5 w-5" />}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-soft">
                Already registered?{' '}
                <Link to="/login" className="font-bold text-brand hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 border-t border-line bg-surface/70 px-6 py-3">
              <ShieldCheck className="h-3 w-3 text-safe" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Encrypted · Human-approved · Never sold
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
