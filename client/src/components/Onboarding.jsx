import { useState } from 'react';
import {
  Shield, MapPin, Bell, Mic, ArrowRight, Check, Siren,
  Lock, Eye, Radio, FileText, ChevronDown
} from 'lucide-react';
import PakistanParticleMap from './common/PakistanParticleMap';

const STORAGE_KEY = 'ciro-onboarding-complete';

export function isOnboardingComplete() {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
  catch { return false; }
}

export function completeOnboarding() {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
}

/**
 * Onboarding redesigned to match the prototype (§70):
 * periwinkle canvas, particle-Pakistan hero, navy arch footer,
 * consent checklist with summary bottom sheet, round blue arrow button.
 */
const STEPS = [
  {
    id: 'welcome',
    title: 'Pakistan’s Emergency\nIntelligence Network',
    subtitle: 'Secure. Connected. Human-led.',
    description:
      'CIRO connects citizens, responders and command centers with AI-verified emergency intelligence — reports verified in seconds, alerts in your area, shelters near you.',
    buttonText: 'Get Started',
    cities: false,
    emergency: false
  },
  {
    id: 'consent',
    title: 'Your Consent,\nYour Control',
    subtitle: 'Read how CIRO protects you',
    description:
      'Before we activate your safety network, review what CIRO will use and why. Nothing is shared without your approval.',
    buttonText: 'I Agree & Continue',
    requiresConsent: true,
    cities: false,
    emergency: false
  },
  {
    id: 'location',
    title: 'Enable Location\nIntelligence',
    subtitle: 'For area alerts & fast response',
    description:
      'CIRO uses your position only during emergencies — to verify reports, route the nearest team and warn you about incidents in your area.',
    buttonText: 'Allow Location',
    permission: 'geolocation',
    skipLabel: 'Maybe Later',
    cities: true,
    emergency: false
  },
  {
    id: 'notifications',
    title: 'Real-Time\nSafety Alerts',
    subtitle: 'Verified warnings, seconds after detection',
    description:
      'Receive AI-verified emergency broadcasts for your area. Critical alerts bypass silent mode so you never miss a warning.',
    buttonText: 'Enable Alerts',
    permission: 'notifications',
    skipLabel: 'Skip',
    cities: true,
    emergency: true
  },
  {
    id: 'microphone',
    title: 'Speak Your\nEmergency',
    subtitle: 'Voice-to-report in Urdu & English',
    description:
      'Allow the microphone so you can report hands-free — speak in Urdu, English or Roman Urdu and CIRO fills the form for you.',
    buttonText: 'Allow Microphone',
    permission: 'microphone',
    skipLabel: 'Skip',
    cities: false,
    emergency: false
  }
];

/** Consent items shown on the consent step + in the summary sheet. */
const CONSENT_ITEMS = [
  {
    id: 'location',
    Icon: MapPin,
    title: 'Location during emergencies',
    body: 'Your GPS position is used to verify reports, find nearby shelters and send area alerts.',
    control: 'toggle'
  },
  {
    id: 'alerts',
    Icon: Radio,
    title: 'Emergency broadcasts',
    body: 'Push alerts for verified incidents around you. Critical warnings bypass silent mode.',
    control: 'toggle'
  },
  {
    id: 'voice',
    Icon: Mic,
    title: 'Voice reporting',
    body: 'Record voice notes to auto-fill emergency reports. Audio is processed and never sold.',
    control: 'toggle'
  },
  {
    id: 'privacy',
    Icon: Eye,
    title: 'Privacy promise',
    body: 'End-to-end encryption for sensitive data. Your data is never sold to third parties.',
    control: 'check',
    locked: true
  }
];

async function requestPermission(type) {
  try {
    if (type === 'geolocation' && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 10000 }
        );
      });
    }
    if (type === 'notifications' && 'Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    if (type === 'microphone' && navigator.mediaDevices) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState({ location: true, alerts: true, voice: true, privacy: true });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [permissionResults, setPermissionResults] = useState({});
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleNext() {
    if (current.requiresConsent && !consent.privacy) return;

    if (current.permission) {
      const granted = await requestPermission(current.permission);
      setPermissionResults((p) => ({ ...p, [current.permission]: granted }));
    }

    if (isLast) {
      completeOnboarding();
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleSkip() {
    if (current.permission) {
      setPermissionResults((p) => ({ ...p, [current.permission]: false }));
    }
    if (isLast) {
      completeOnboarding();
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[99998] flex flex-col overflow-hidden bg-peri">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 px-6 pb-1 pt-[calc(env(safe-area-inset-top)+14px)]">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 bg-brand' : i < step ? 'w-4 bg-brand/50' : 'w-4 bg-navy/15'
            }`}
          />
        ))}
      </div>

      {/* Hero — particle Pakistan map */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <PakistanParticleMap
          showCities={current.cities}
          showShield={step === 0}
          emergency={current.emergency}
          className="h-full max-h-[52vh] w-auto drop-shadow-[0_20px_40px_rgb(10_30_66/0.25)]"
        />
        {/* step chip */}
        <div className="absolute left-6 top-2 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-navy shadow-card backdrop-blur">
          <Siren className="h-3 w-3 text-brand" />
          CIRO · Step {step + 1} of {STEPS.length}
        </div>
      </div>

      {/* Navy arch footer */}
      <div className="arch-t relative bg-navy px-7 pb-[calc(env(safe-area-inset-bottom)+26px)] pt-9 text-white">
        {/* cyan glow accent */}
        <div className="pointer-events-none absolute -top-10 left-1/2 h-24 w-72 -translate-x-1/2 rounded-full bg-aqua/20 blur-3xl" />

        <h1 className="whitespace-pre-line text-[26px] font-extrabold leading-tight tracking-tight">
          {current.title}
        </h1>
        <p className="mt-1 text-[13px] font-semibold text-aqua">{current.subtitle}</p>
        <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-white/70">
          {current.description}
        </p>

        {/* Consent checklist preview */}
        {current.requiresConsent && (
          <div className="mt-4 space-y-2">
            {CONSENT_ITEMS.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-2.5 transition hover:bg-white/[0.12]"
              >
                <item.Icon className="h-4 w-4 shrink-0 text-aqua" />
                <span className="flex-1 text-[13px] font-medium text-white/90">{item.title}</span>
                {item.control === 'toggle' ? (
                  <input
                    type="checkbox"
                    className="proto-toggle"
                    checked={consent[item.id]}
                    onChange={(e) => setConsent((c) => ({ ...c, [item.id]: e.target.checked }))}
                  />
                ) : (
                  <input
                    type="checkbox"
                    className="proto-check"
                    checked={consent[item.id]}
                    onChange={(e) => setConsent((c) => ({ ...c, [item.id]: e.target.checked }))}
                  />
                )}
              </label>
            ))}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1 pt-1 text-xs font-semibold text-aqua/90 transition hover:text-aqua"
            >
              <FileText className="h-3.5 w-3.5" /> Read full consent summary
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Permission result note */}
        {current.permission && permissionResults[current.permission] !== undefined && (
          <div className={`mt-3 flex items-center gap-2 text-xs font-semibold ${
            permissionResults[current.permission] ? 'text-emerald-300' : 'text-white/50'
          }`}>
            <Check className="h-3.5 w-3.5" />
            {permissionResults[current.permission] ? 'Permission granted' : 'Skipped — you can enable this later in settings'}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-4">
          <button
            onClick={handleNext}
            disabled={current.requiresConsent && !consent.privacy}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-glow-brand transition hover:bg-brand-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={current.buttonText}
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{current.buttonText}</p>
            {current.skipLabel ? (
              <button onClick={handleSkip} className="text-xs font-medium text-white/50 underline-offset-2 transition hover:text-white/80 hover:underline">
                {current.skipLabel}
              </button>
            ) : (
              <p className="flex items-center gap-1 text-[11px] text-white/40">
                <Lock className="h-3 w-3" /> Encrypted · Audited · Human-approved
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] font-medium tracking-wide text-white/30">
          Secure. Connected. Human-led.
        </p>
      </div>

      {/* Consent summary bottom sheet */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-[95] bg-navy/60 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="sheet z-[96] px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3">
            <h2 className="mt-2 text-lg font-extrabold text-navy">Consent Summary</h2>
            <p className="mt-1 text-xs text-ink-soft">
              What CIRO uses, why, and how you stay in control. You can change these anytime in Settings.
            </p>
            <div className="mt-4 space-y-3">
              {CONSENT_ITEMS.map((item) => (
                <div key={item.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <item.Icon className="h-4.5 w-4.5" />
                    </span>
                    <p className="text-sm font-bold text-ink">{item.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-navy p-4 text-xs leading-relaxed text-white/70">
              <p className="flex items-center gap-1.5 font-bold text-white">
                <Shield className="h-3.5 w-3.5 text-aqua" /> Safety rules
              </p>
              <p className="mt-1.5">
                AI detects and recommends — human dispatchers approve every final dispatch.
                Safety instructions are pre-approved by emergency experts, and every AI
                decision is saved in an audit log.
              </p>
            </div>
            <button
              onClick={() => setSheetOpen(false)}
              className="btn-primary mt-4 w-full rounded-2xl py-3.5"
            >
              Got it
            </button>
          </div>
        </>
      )}
    </div>
  );
}
