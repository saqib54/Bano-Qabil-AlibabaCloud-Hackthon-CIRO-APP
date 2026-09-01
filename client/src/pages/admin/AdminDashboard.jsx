import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Users,
  Send,
  CheckCircle2,
  BellRing,
  HeartHandshake,
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  Copy,
  Gauge,
  Siren,
  TrendingUp,
  Satellite,
  Eye,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import KpiCard from '../../components/common/KpiCard';
import StatusPill from '../../components/common/StatusPill';
import CiroMap from '../../components/common/CiroMap';
import { useAuthStore } from '../../store/auth.store';
import { adminApi } from '../../api/admin.api';
import { verificationApi } from '../../api/verification.api';
import { mapApi } from '../../api/map.api';
import { useRealtime } from '../../hooks/useRealtime';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI,
  statusLabel,
  statusTone
} from '../../constants/incidents';

const SEVERITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger border-danger/30',
  HIGH: 'bg-warn-soft text-warn border-warn/30',
  MEDIUM: 'bg-brand-soft text-brand border-brand/30',
  LOW: 'bg-surface text-ink-soft border-line'
};

const VERDICT_META = {
  AUTO_VERIFIED: { label: 'AUTO-VERIFIED', cls: 'bg-safe-soft text-safe border-safe/30', icon: ShieldCheck },
  NEEDS_REVIEW: { label: 'NEEDS REVIEW', cls: 'bg-warn-soft text-warn border-warn/30', icon: AlertTriangle },
  SUSPECTED_DUPLICATE: { label: 'DUPLICATE?', cls: 'bg-danger-soft text-danger border-danger/30', icon: Copy },
  LOW_CONFIDENCE: { label: 'LOW CONFIDENCE', cls: 'bg-surface text-ink-soft border-line', icon: Gauge }
};

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [kpis, setKpis] = useState(null);
  const [criticalQueue, setCriticalQueue] = useState([]);
  const [feed, setFeed] = useState({ runs: [], stats: null });
  const [mapIncidents, setMapIncidents] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [dispatchedIds, setDispatchedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [freshIds, setFreshIds] = useState(() => new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.kpis(),
      adminApi.incidents({ severity: 'CRITICAL', limit: '5' }),
      verificationApi.feed(12),
      mapApi.incidents(),
      verificationApi.forecast(90).catch(() => null)
    ])
      .then(([kpiData, incidents, feedData, incidentsMap, forecastData]) => {
        setKpis(kpiData);
        setCriticalQueue(incidents || []);
        setFeed(feedData || { runs: [], stats: null });
        setMapIncidents(incidentsMap || []);
        setForecast(forecastData);
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load dashboard')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshLive = useCallback(() => {
    Promise.all([adminApi.kpis(), adminApi.incidents({ severity: 'CRITICAL', limit: '5' }), mapApi.incidents()])
      .then(([kpiData, incidents, incidentsMap]) => {
        setKpis(kpiData);
        setCriticalQueue(incidents || []);
        setMapIncidents(incidentsMap || []);
      })
      .catch(() => {});
  }, []);

  // Real-time: pipeline verdicts land the moment an AI agent finishes
  useRealtime({
    'incident.pipeline': (event) => {
      if (!event.run) return;
      const run = { ...event.run, auto_alerted: !!event.run.auto_alerted };
      setFeed((prev) => ({
        ...prev,
        runs: [run, ...prev.runs.filter((r) => r.incident_id !== run.incident_id)].slice(0, 12)
      }));
      setFreshIds((prev) => new Set(prev).add(run.incident_id));
      setTimeout(() => {
        setFreshIds((prev) => {
          const next = new Set(prev);
          next.delete(run.incident_id);
          return next;
        });
      }, 10000);
      refreshLive();
    },
    'alert.new': () => {
      // Auto/public alerts imply new critical activity — keep KPIs fresh
      refreshLive();
    }
  });

  // Determine city status from KPIs
  const criticalCount = kpis?.criticalIncidents ?? 0;
  const activeCount = kpis?.activeIncidents ?? 0;

  let riskLevel = 'LOW';
  let riskLabel = 'No active critical alerts';
  let riskBannerClass = 'border-safe/20 bg-safe-soft/60';
  let riskIconClass = 'bg-safe';

  if (criticalCount >= 3) {
    riskLevel = 'CRITICAL';
    riskLabel = `${criticalCount} critical incidents active`;
    riskBannerClass = 'border-danger/20 bg-danger-soft/60';
    riskIconClass = 'bg-danger';
  } else if (criticalCount >= 1 || activeCount >= 8) {
    riskLevel = 'HIGH';
    riskLabel = `${criticalCount} critical · ${activeCount} active incidents`;
    riskBannerClass = 'border-warn/20 bg-warn-soft/60';
    riskIconClass = 'bg-warn';
  } else if (activeCount >= 3) {
    riskLevel = 'MEDIUM';
    riskLabel = `${activeCount} active incidents being monitored`;
    riskBannerClass = 'border-brand/20 bg-brand-soft/40';
    riskIconClass = 'bg-brand';
  }

  const stats = feed.stats;
  const avgSeconds = stats ? (stats.avgDurationMs / 1000).toFixed(1) : '—';

  // AI Decision Center queue — runs that need a human decision (§71)
  const decisionQueue = feed.runs.filter(
    (r) => ['NEEDS_REVIEW', 'LOW_CONFIDENCE', 'SUSPECTED_DUPLICATE'].includes(r.verdict)
  );

  // Geo-Impact polygons computed by the GeoImpact agent, drawn on the ops map
  const mapImpactZones = useMemo(() => {
    const ZONE_COLOR = { CRITICAL: '#E11D48', HIGH: '#F59E0B', MEDIUM: '#2563EB' };
    return feed.runs
      .filter((r) => r.impact_shape?.polygon?.length >= 3)
      .map((r) => ({
        id: `zone-${r.incident_id}`,
        polygon: r.impact_shape.polygon,
        kind: r.impact_shape.kind,
        color: ZONE_COLOR[r.severity] || '#2563EB',
        label: `${r.incident_number} · ${r.category?.replace('_', ' ')}`,
        affected: r.affected_estimate
      }));
  }, [feed.runs]);

  async function onApproveDispatch(run) {
    setDispatchingId(run.incident_id);
    try {
      await verificationApi.approveDispatch(run.incident_id);
      setDispatchedIds((prev) => new Set(prev).add(run.incident_id));
      refreshLive();
    } catch (err) {
      console.error(getErrorMessage(err, 'Approve & dispatch failed'));
    } finally {
      setDispatchingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Risk banner */}
      <div className={`card flex flex-col gap-3 ${riskBannerClass} p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${riskIconClass} text-white`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Emergency risk banner</p>
            <p className="text-lg font-bold">
              {loading ? 'Loading…' : criticalCount >= 3 ? 'High Alert' : criticalCount >= 1 ? 'Elevated Risk' : activeCount >= 3 ? 'Moderate Activity' : 'Normal Operations'}
            </p>
          </div>
        </div>
        <StatusPill value={riskLevel} label={riskLabel} />
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-sm text-ink-soft">Signed in as {user?.full_name} · Administrator</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-safe/30 bg-safe-soft/60 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
          </span>
          <Bot className="h-4 w-4 text-safe" />
          <p className="text-xs font-bold text-safe">
            AI Grid Online — avg verify {avgSeconds}s
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Flame}
          label="Active Incidents"
          value={kpis?.activeIncidents ?? '—'}
          tone={activeCount > 5 ? 'danger' : 'brand'}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Critical Incidents"
          value={kpis?.criticalIncidents ?? '—'}
          tone={criticalCount > 0 ? 'danger' : 'safe'}
        />
        <KpiCard
          icon={Users}
          label="Responders Available"
          value={kpis?.respondersAvailable ?? '—'}
          tone="safe"
        />
        <KpiCard
          icon={Send}
          label="Responders Deployed"
          value={kpis?.respondersDeployed ?? '—'}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Resolved Today"
          value={kpis?.resolvedToday ?? '—'}
          tone="safe"
        />
        <KpiCard
          icon={BellRing}
          label="Citizens Assisted"
          value={kpis?.citizensAssisted ?? '—'}
          tone="brand"
        />
        <KpiCard
          icon={HeartHandshake}
          label="Total in Pipeline"
          value={kpis ? (kpis.activeIncidents + kpis.resolvedToday) : '—'}
        />
      </div>

      {/* Rapid Intelligence Grid — live AI verification feed */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">AI Verification Pipeline</h2>
              <p className="text-[10px] text-ink-soft">10 AI agents verify every report in real time — live feed</p>
            </div>
          </div>
          {stats && (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="rounded-full bg-safe-soft px-2.5 py-1 text-safe">
                {stats.autoVerifiedRate}% AUTO-VERIFIED
              </span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">
                {stats.avgDurationMs} ms AVG
              </span>
              <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn">
                {stats.alertsIssued} ALERTS ISSUED
              </span>
              <span className="rounded-full bg-danger-soft px-2.5 py-1 text-danger">
                {stats.duplicates} DUPLICATES CAUGHT
              </span>
            </div>
          )}
        </div>

        <div className="divide-y divide-line">
          {feed.runs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bot className="mx-auto h-8 w-8 text-ink-soft/40" />
              <p className="mt-2 text-sm font-medium">Pipeline is standing by</p>
              <p className="mt-1 text-xs text-ink-soft">
                Every new citizen report is verified by five AI agents within seconds — runs appear here live.
              </p>
            </div>
          ) : (
            feed.runs.map((run) => {
              const verdict = VERDICT_META[run.verdict] || VERDICT_META.NEEDS_REVIEW;
              const VerdictIcon = verdict.icon;
              const isFresh = freshIds.has(run.incident_id);
              return (
                <Link
                  key={`${run.id}-${run.incident_id}`}
                  to={`/admin/incidents/${run.incident_id}`}
                  className={`flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface ${isFresh ? 'bg-brand-soft/25' : ''}`}
                >
                  <span className="text-xl shrink-0">{CATEGORY_EMOJI[run.category] || '📋'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{run.title}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${verdict.cls}`}>
                        <VerdictIcon className="h-2.5 w-2.5" />
                        {verdict.label}
                      </span>
                      {run.auto_alerted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[9px] font-bold text-danger">
                          <Siren className="h-2.5 w-2.5" /> PUBLIC ALERTED
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {run.incident_number}
                      {run.location_name ? ` · ${run.location_name}` : ''}
                      {run.corroborating_count > 0 ? ` · ${run.corroborating_count} corroborating report${run.corroborating_count > 1 ? 's' : ''}` : ''}
                      {run.routed_department_name ? ` · routed to ${run.routed_department_name}` : ''}
                      {' · '}{formatWhen(run.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {/* Confidence meter */}
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full rounded-full ${run.confidence >= 75 ? 'bg-safe' : run.confidence >= 40 ? 'bg-warn' : 'bg-danger'}`}
                          style={{ width: `${run.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-ink">{run.confidence}%</span>
                    </div>
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-ink-soft">
                      <Zap className="h-2.5 w-2.5" />
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* AI Decision Center (§71) — human approval gate */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-aqua">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">AI Decision Center</h2>
              <p className="text-[10px] text-ink-soft">
                AI recommends — you approve. Every dispatch is human-confirmed and audit-logged.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[10px] font-bold text-warn">
            {decisionQueue.length} AWAITING DECISION
          </span>
        </div>

        <div className="divide-y divide-line">
          {decisionQueue.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-safe/50" />
              <p className="mt-2 text-sm font-medium">Decision queue is clear</p>
              <p className="mt-1 text-xs text-ink-soft">
                Auto-verified reports are handled instantly; anything uncertain lands here for your call.
              </p>
            </div>
          ) : (
            decisionQueue.map((run) => {
              const verdict = VERDICT_META[run.verdict] || VERDICT_META.NEEDS_REVIEW;
              const VerdictIcon = verdict.icon;
              const dispatched = dispatchedIds.has(run.incident_id);
              return (
                <div key={`d-${run.id}`} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl">{CATEGORY_EMOJI[run.category] || '📋'}</span>
                    <p className="text-sm font-semibold text-ink">{run.title}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${verdict.cls}`}>
                      <VerdictIcon className="h-2.5 w-2.5" /> {verdict.label}
                    </span>
                    {(run.spam_score ?? 0) >= 40 && (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[9px] font-bold text-danger">
                        SPAM RISK {run.spam_score}
                      </span>
                    )}
                    {run.satellite_signal === 'SUPPORTING' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-bold text-brand">
                        <Satellite className="h-2.5 w-2.5" /> SATELLITE SUPPORT
                      </span>
                    )}
                    {run.duplicate_of_incident_id && (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[9px] font-bold text-danger">
                        DUPLICATE WARNING
                      </span>
                    )}
                    <span className="ml-auto text-xs font-bold text-ink">{run.confidence}% confidence</span>
                  </div>

                  {/* Copilot summary */}
                  {run.copilot_summary && (
                    <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs leading-relaxed text-ink-soft">
                      <span className="font-bold text-brand">Copilot: </span>
                      {run.copilot_summary}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {dispatched ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-safe-soft px-3 py-2 text-xs font-bold text-safe">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Dispatch approved — citizen notified with ETA
                      </span>
                    ) : (
                      <button
                        onClick={() => onApproveDispatch(run)}
                        disabled={dispatchingId === run.incident_id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-safe px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60"
                      >
                        {dispatchingId === run.incident_id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve & Dispatch
                      </button>
                    )}
                    <Link
                      to={`/admin/incidents/${run.incident_id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:bg-surface"
                    >
                      <Eye className="h-3.5 w-3.5" /> Manual Review
                    </Link>
                    {run.affected_estimate > 0 && (
                      <span className="text-[10px] font-semibold text-ink-soft">
                        ~{run.affected_estimate.toLocaleString()} people in impact zone ({run.impact_radius_m} m)
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ops map + queue preview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card flex flex-col overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-safe" />
              </span>
              <p className="text-sm font-semibold">Live Operations Map</p>
            </div>
            <Link to="/admin/map" className="text-xs font-semibold text-brand hover:underline">
              Open full map →
            </Link>
          </div>
          <div className="p-3" style={{ height: 320 }}>
            <CiroMap
              incidents={mapIncidents}
              impactZones={mapImpactZones}
              hotspots={forecast?.hotspots?.slice(0, 8) || []}
              minHeight={300}
              showLegend={false}
            />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Critical Incident Queue</p>
            <Link to="/admin/incidents" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-line bg-surface p-4 text-center text-xs text-ink-soft">
                Loading…
              </div>
            ) : criticalQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface p-4 text-center">
                <p className="text-sm font-medium">No critical incidents</p>
                <p className="mt-1 text-xs text-ink-soft">
                  All clear — no critical severity incidents in the queue.
                </p>
              </div>
            ) : (
              criticalQueue.map((inc) => {
                const sev = inc.verified_severity || inc.ai_recommended_severity;
                return (
                  <Link
                    key={inc.id}
                    to={`/admin/incidents/${inc.id}`}
                    className="block rounded-xl border border-line p-3 transition hover:bg-surface"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {CATEGORY_EMOJI[inc.category] || '📋'} {inc.title}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-soft">{inc.incident_number} · {formatWhen(inc.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {sev && (
                          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${SEVERITY_TONE[sev] || ''}`}>
                            {sev}
                          </span>
                        )}
                        <span className={`pill ${statusTone(inc.status)}`}>
                          <span className="h-1 w-1 rounded-full bg-current" />
                          <span className="text-[10px]">{statusLabel(inc.status)}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Emergency Forecasting (§71) */}
      {forecast && forecast.hotspots && forecast.hotspots.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warn-soft text-warn">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Emergency Forecast — Predicted Hotspots</h2>
              <p className="text-[10px] text-ink-soft">
                Clustered from reports in the last {forecast.windowDays} days — pre-position teams where risk is building.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {forecast.hotspots.slice(0, 6).map((h) => (
              <div key={h.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">
                    {CATEGORY_EMOJI[h.category] || '📍'} {h.category.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    h.risk_score >= 60 ? 'bg-danger-soft text-danger'
                    : h.risk_score >= 30 ? 'bg-warn-soft text-warn'
                    : 'bg-brand-soft text-brand'
                  }`}>
                    RISK {h.risk_score}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full ${h.risk_score >= 60 ? 'bg-danger' : h.risk_score >= 30 ? 'bg-warn' : 'bg-brand'}`}
                    style={{ width: `${h.risk_score}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-soft">
                  {h.incident_count} incidents · {h.latitude.toFixed(3)}, {h.longitude.toFixed(3)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
