import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Siren,
  ShieldAlert,
  MapPin,
  MessageCircle,
  PhoneCall,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Bell,
  Home,
  Flame,
  Radio,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { incidentsApi } from '../../api/incidents.api';
import { mapApi } from '../../api/map.api';
import CiroMap from '../../components/common/CiroMap';
import PakistanParticleMap from '../../components/common/PakistanParticleMap';
import AlertTicker from '../../components/common/AlertTicker';
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  statusLabel,
  statusTone
} from '../../constants/incidents';

const ACTIVE_STATUSES = [
  'REPORTED', 'AI_ANALYZED', 'UNDER_REVIEW', 'VERIFIED',
  'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE',
  'RESOLUTION_SUBMITTED', 'REOPENED'
];

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function PublicDashboard() {
  const user = useAuthStore((s) => s.user);
  const [incidents, setIncidents] = useState(null);
  const [loadError, setLoadError] = useState('');

  // City pulse — live citywide situation (refreshed every minute)
  const [cityIncidents, setCityIncidents] = useState([]);
  const [cityShelters, setCityShelters] = useState([]);

  const loadCityPulse = useCallback(() => {
    Promise.all([mapApi.incidents(), mapApi.shelters()])
      .then(([inc, sh]) => {
        setCityIncidents(inc || []);
        setCityShelters((sh || []).filter((s) => s.is_active));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    incidentsApi
      .mine()
      .then(setIncidents)
      .catch(() => setLoadError('Could not load your reports'));
  }, []);

  useEffect(() => {
    loadCityPulse();
    const interval = setInterval(loadCityPulse, 60000);
    return () => clearInterval(interval);
  }, [loadCityPulse]);

  const activeReports = (incidents || []).filter(
    (i) => ACTIVE_STATUSES.includes(i.status)
  );
  const resolvedReports = (incidents || []).filter(
    (i) => i.status === 'RESOLVED'
  );

  // Citywide live counts
  const cityCritical = cityIncidents.filter(
    (i) => (i.verified_severity || i.ai_recommended_severity) === 'CRITICAL'
  ).length;
  const cityHigh = cityIncidents.filter(
    (i) => (i.verified_severity || i.ai_recommended_severity) === 'HIGH'
  ).length;

  // Derive city safety from citywide data
  const hasCritical = cityCritical > 0;
  const hasActiveReports = cityIncidents.length > 0;

  return (
    <div className="space-y-6">
      {/* Live emergency alerts — pushed in real time */}
      <AlertTicker maxVisible={2} />

      {/* City safety banner */}
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            hasCritical ? 'bg-danger-soft text-danger' :
            hasActiveReports ? 'bg-warn-soft text-warn' :
            'bg-safe-soft text-safe'
          }`}>
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">City safety</p>
            <p className="text-lg font-bold">
              {hasCritical ? 'High Alert' : hasActiveReports ? 'Moderate Risk' : 'All Clear'}
            </p>
          </div>
        </div>
        <p className="text-sm text-ink-soft">
          {cityIncidents.length === 0
            ? 'Monitoring the city — no active emergencies right now.'
            : `${cityIncidents.length} active incident${cityIncidents.length > 1 ? 's' : ''} across the city · ${cityShelters.length} safe places open.`}
        </p>
      </div>

      {/* SOS hero — prototype design (§70): navy canvas + particle Pakistan map */}
      <div className="card overflow-hidden p-0">
        <div className="relative overflow-hidden bg-navy p-6 text-white sm:p-8">
          {/* ambient glows */}
          <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-brand/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-aqua/15 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-aqua">
                {hasCritical ? '⚠ High alert in your city' : 'Pakistan Emergency Network'}
              </p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                Hello {user?.full_name?.split(' ')[0]},{' '}
                <span className="bg-gradient-to-r from-aqua to-brand-glow bg-clip-text text-transparent">
                  stay safe.
                </span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Report an emergency by voice, text or photo — CIRO's AI agents verify it
                within seconds and alert everyone nearby automatically.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to="/public/report"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-aqua-dark px-6 py-3 text-sm font-bold text-white shadow-glow-brand transition hover:brightness-110 active:scale-[0.97]"
                >
                  <Siren className="h-5 w-5" />
                  REPORT EMERGENCY
                </Link>
                <Link
                  to="/public/map"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                  title="Open safety map"
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-white/50">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-aqua" /> AI-verified in seconds
                </span>
                <span className="flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-aqua" /> Area alerts
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-aqua" /> Human-led dispatch
                </span>
              </div>
            </div>

            {/* Particle Pakistan map */}
            <div className="flex items-center justify-center">
              <PakistanParticleMap
                showCities
                showLabels
                showShield
                emergency={hasCritical}
                className="h-56 w-auto opacity-95 sm:h-72"
              />
            </div>
          </div>

          <p className="relative z-10 mt-4 text-center text-[11px] font-medium tracking-wide text-white/30">
            Secure. Connected. Human-led.
          </p>
        </div>
        <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <QuickAction to="/public/map" icon={MapPin} title="Safety Map" subtitle="Live incidents & shelters near you" />
          <QuickAction to="/public/assistant" icon={MessageCircle} title="Ask CIRO AI" subtitle="First aid & safety guidance" />
          <QuickAction to="tel:1122" icon={PhoneCall} title="Call Rescue 1122" subtitle="Official emergency line" />
        </div>
      </div>

      {/* City pulse — live citywide stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          title="Critical Nearby"
          value={cityCritical}
          subtitle="Citywide critical incidents"
          tone={cityCritical > 0 ? 'danger' : 'safe'}
        />
        <StatCard
          icon={AlertTriangle}
          title="High Severity"
          value={cityHigh}
          subtitle="Citywide high-severity reports"
          tone={cityHigh > 0 ? 'warn' : 'safe'}
        />
        <StatCard
          icon={Radio}
          title="Active Incidents"
          value={cityIncidents.length}
          subtitle="Live across the city"
          tone="brand"
          live
        />
        <StatCard
          icon={Shield}
          title="Safe Places"
          value={cityShelters.length}
          subtitle="Shelters & hospitals open"
          tone="safe"
        />
      </div>

      {/* Live city map */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Live City Map
            </h2>
          </div>
          <Link to="/public/map" className="text-xs font-semibold text-brand hover:underline">
            Open full map →
          </Link>
        </div>
        <div className="p-3" style={{ height: 340 }}>
          <CiroMap
            incidents={cityIncidents}
            shelters={cityShelters}
            minHeight={320}
            showLegend={false}
          />
        </div>
      </div>

      {/* My reports stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          title="My Active Reports"
          value={incidents === null ? '…' : activeReports.length}
          subtitle={activeReports.length > 0 ? 'Currently being handled' : 'No active reports'}
          tone="brand"
        />
        <StatCard
          icon={CheckCircle2}
          title="Resolved"
          value={incidents === null ? '…' : resolvedReports.length}
          subtitle="Successfully resolved"
          tone="safe"
        />
        <StatCard
          icon={Clock}
          title="Under Review"
          value={incidents === null ? '…' : activeReports.filter((i) => ['REPORTED', 'AI_ANALYZED', 'UNDER_REVIEW'].includes(i.status)).length}
          subtitle="Awaiting verification"
          tone="warn"
        />
        <StatCard
          icon={AlertTriangle}
          title="Total Reports"
          value={incidents === null ? '…' : incidents.length}
          subtitle="All time submissions"
          tone="ink"
        />
      </div>

      {/* Active reports list */}
      {activeReports.length > 0 && (
        <section className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Active Reports
            </h2>
            <Link to="/public/incidents" className="text-xs font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-line">
            {activeReports.slice(0, 4).map((inc) => (
              <Link
                key={inc.id}
                to={`/public/incidents/${inc.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-surface"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{CATEGORY_EMOJI[inc.category] || '📋'}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{inc.title}</p>
                    <p className="text-xs text-ink-soft">
                      {CATEGORY_LABEL[inc.category] || inc.category}
                      {inc.location_name ? ` · ${inc.location_name}` : ''}
                      {' · '}{formatWhen(inc.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`pill shrink-0 ${statusTone(inc.status)}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusLabel(inc.status)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state when no reports at all */}
      {incidents?.length === 0 && (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-4xl">📭</span>
          <p className="font-semibold text-ink">No reports yet</p>
          <p className="max-w-sm text-sm text-ink-soft">
            If you ever witness an emergency, report it right away — every report helps the city respond faster.
          </p>
          <Link to="/public/report" className="btn-danger mt-2">
            <Siren className="h-4 w-4" /> Report an Emergency
          </Link>
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
          {loadError}
        </div>
      )}

      {/* Quick access widgets */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link to="/public/alerts" className="card flex items-center gap-3 p-4 transition hover:shadow-lift active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warn-soft text-warn">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Active Alerts</p>
            <p className="text-xs text-ink-soft">Emergency broadcasts & warnings</p>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-soft/50" />
        </Link>
        <Link to="/public/safe-places" className="card flex items-center gap-3 p-4 transition hover:shadow-lift active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-safe-soft text-safe">
            <Home className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Nearest Safe Place</p>
            <p className="text-xs text-ink-soft">Find shelters & safe zones</p>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-soft/50" />
        </Link>
        <Link to="/public/assistant" className="card flex items-center gap-3 p-4 transition hover:shadow-lift active:scale-[0.98]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Ask CIRO AI</p>
            <p className="text-xs text-ink-soft">First aid & safety guidance</p>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-soft/50" />
        </Link>
      </div>

      {/* Floating SOS button (mobile only) */}
      <Link
        to="/public/report"
        className="fixed bottom-24 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-danger text-white shadow-lift transition active:scale-90 md:hidden animate-bounce-gentle"
        title="Report Emergency"
      >
        <Siren className="h-6 w-6" />
      </Link>
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, subtitle }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-4 transition hover:bg-surface sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-sm font-semibold">
          {title}
          <ArrowRight className="h-3.5 w-3.5 text-ink-soft" />
        </p>
        <p className="truncate text-xs text-ink-soft">{subtitle}</p>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, tone, live }) {
  const toneMap = {
    brand: 'bg-brand-soft text-brand',
    safe: 'bg-safe-soft text-safe',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    ink: 'bg-surface text-ink-soft'
  };
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[tone] || toneMap.ink}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            {title}
            {live && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-safe" />
              </span>
            )}
          </p>
          <p className="text-2xl font-bold text-ink">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{subtitle}</p>
    </div>
  );
}
