import { ShieldCheck, Radio, Bot } from 'lucide-react';
import PakistanParticleMap from '../../../components/common/PakistanParticleMap';

/**
 * Auth brand panel — prototype design (§70): deep navy canvas, particle
 * Pakistan map, cyan gradient headline, "Secure. Connected. Human-led."
 * On mobile it renders as a compact arch-topped hero instead of a column.
 */
export default function AuthBrandPanel({ variant = 'login' }) {
  return (
    <>
      {/* Desktop side panel */}
      <div className="relative hidden overflow-hidden bg-navy lg:flex lg:flex-col lg:justify-between">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-24 h-64 w-64 rounded-full bg-aqua/15 blur-3xl" />

        <div className="relative z-10 px-10 pt-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-navy-soft text-white shadow-glow-brand">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-white">CIRO</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                Crisis Intelligence & Response
              </p>
            </div>
          </div>

          <h2 className="mt-8 max-w-sm text-3xl font-extrabold leading-tight text-white">
            Pakistan’s{' '}
            <span className="bg-gradient-to-r from-aqua to-brand-glow bg-clip-text text-transparent">
              Emergency Intelligence
            </span>{' '}
            Network
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            {variant === 'register'
              ? 'Join the citizen network — report emergencies by voice or text and let AI-verified response reach you in seconds.'
              : 'Sign back in to your safety network — AI-verified reports, area alerts and live response tracking.'}
          </p>
        </div>

        {/* particle map */}
        <div className="relative z-10 flex justify-center">
          <PakistanParticleMap
            showCities
            showLabels
            className="h-[44vh] max-h-[420px] w-auto opacity-95"
          />
        </div>

        <div className="relative z-10 px-10 pb-9">
          <div className="flex items-center gap-5 text-[11px] font-semibold text-white/50">
            <span className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-aqua" /> AI-verified in seconds
            </span>
            <span className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-aqua" /> Area alerts
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-aqua" /> Human-led dispatch
            </span>
          </div>
          <p className="mt-3 text-[11px] font-medium tracking-wide text-white/30">
            Secure. Connected. Human-led.
          </p>
        </div>
      </div>

      {/* Mobile compact hero */}
      <div className="arch-b relative overflow-hidden bg-navy px-6 pb-10 pt-[calc(env(safe-area-inset-top)+20px)] text-center lg:hidden">
        <div className="pointer-events-none absolute -top-12 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative z-10 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-navy-soft text-white shadow-glow-brand">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-base font-extrabold tracking-tight text-white">CIRO</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
              Crisis Intelligence & Response
            </p>
          </div>
        </div>
        <PakistanParticleMap className="mx-auto mt-2 h-40 w-auto" showCities />
        <p className="relative z-10 text-[11px] font-medium tracking-wide text-white/40">
          Secure. Connected. Human-led.
        </p>
      </div>
    </>
  );
}
