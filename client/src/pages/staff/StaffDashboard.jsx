import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Navigation,
  MapPin,
  CheckCircle2,
  BellRing,
  Power,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import KpiCard from '../../components/common/KpiCard';
import StatusPill from '../../components/common/StatusPill';
import { staffApi } from '../../api/staff.api';
import { getErrorMessage } from '../../api/client';
import {
  CATEGORY_EMOJI,
  statusLabel,
  statusTone
} from '../../constants/incidents';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export default function StaffDashboard() {
  const user = useAuthStore((s) => s.user);
  const profile = user?.staff_profile;
  const [dutyStatus, setDutyStatus] = useState(profile?.duty_status || 'OFF_DUTY');
  const [kpis, setKpis] = useState(null);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      staffApi.kpis(),
      staffApi.assignments()
    ])
      .then(([kpiData, assignments]) => {
        setKpis(kpiData);
        setRecentAssignments((assignments || []).slice(0, 5));
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load dashboard')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleDuty = async () => {
    const next = dutyStatus === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY';
    setToggling(true);
    try {
      await staffApi.toggleDuty(next);
      setDutyStatus(next);
      // Update the store so sidebar badge reflects the change
      useAuthStore.setState((s) => ({
        user: {
          ...s.user,
          staff_profile: { ...s.user?.staff_profile, duty_status: next }
        }
      }));
    } catch (err) {
      console.error(getErrorMessage(err, 'Failed to toggle duty'));
    } finally {
      setToggling(false);
    }
  };

  // Find current active assignment (ASSIGNED, ACCEPTED, EN_ROUTE, ON_SCENE)
  const activeStatuses = ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE'];
  const currentAssignment = recentAssignments.find((a) =>
    activeStatuses.includes(a.status)
  );

  return (
    <div className="space-y-6">
      {/* Welcome + duty toggle */}
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-soft">Welcome back,</p>
          <h1 className="text-2xl font-bold">{user?.full_name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {profile?.department_name || 'Department not assigned'} · {profile?.designation || 'Responder'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill value={dutyStatus} label={dutyStatus === 'ON_DUTY' ? 'ON DUTY' : 'OFF DUTY'} />
          <button
            onClick={handleToggleDuty}
            disabled={toggling}
            className={`btn-secondary flex items-center gap-2 ${toggling ? 'opacity-60' : ''}`}
          >
            {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            {dutyStatus === 'ON_DUTY' ? 'Go Off Duty' : 'Go On Duty'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={BellRing}
          label="Assigned"
          value={kpis?.assigned ?? '—'}
          tone="brand"
        />
        <KpiCard
          icon={Navigation}
          label="En Route"
          value={kpis?.enRoute ?? '—'}
          tone="warn"
        />
        <KpiCard
          icon={MapPin}
          label="On Scene"
          value={kpis?.onScene ?? '—'}
          tone="warn"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value={kpis?.completed ?? '—'}
          tone="safe"
        />
      </div>

      {/* Current assignment + recent list */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current assignment highlight */}
        <div className="card flex flex-col p-6 lg:col-span-1">
          <p className="text-sm font-semibold">Current Assignment</p>
          {loading ? (
            <p className="mt-4 text-sm text-ink-soft">Loading…</p>
          ) : currentAssignment ? (
            <Link
              to={`/staff/incidents/${currentAssignment.id}`}
              className="mt-4 block rounded-xl border border-line p-4 transition hover:bg-surface"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">
                  {CATEGORY_EMOJI[currentAssignment.category] || '📋'} {currentAssignment.title}
                </p>
                <span className={`pill shrink-0 ${statusTone(currentAssignment.status)}`}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  <span className="text-[10px]">{statusLabel(currentAssignment.status)}</span>
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                {currentAssignment.incident_number} · {currentAssignment.location_name}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Reported {formatWhen(currentAssignment.created_at)}</p>
            </Link>
          ) : (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface py-8 text-center">
              <ClipboardCheck className="h-6 w-6 text-ink-soft/50" />
              <p className="mt-2 text-sm font-medium text-ink-soft">No active assignment</p>
              <p className="mt-1 text-xs text-ink-soft">You'll be notified when a new task is assigned.</p>
            </div>
          )}
        </div>

        {/* Recent assignments */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Recent Assignments</p>
            <Link to="/staff/incidents" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-ink-soft">Loading…</p>
            ) : recentAssignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface p-4 text-center">
                <p className="text-sm font-medium">No assignments yet</p>
                <p className="mt-1 text-xs text-ink-soft">Assigned incidents will appear here.</p>
              </div>
            ) : (
              recentAssignments.map((inc) => (
                <Link
                  key={inc.id}
                  to={`/staff/incidents/${inc.id}`}
                  className="block rounded-xl border border-line p-3 transition hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {CATEGORY_EMOJI[inc.category] || '📋'} {inc.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {inc.incident_number} · {inc.location_name} · {formatWhen(inc.created_at)}
                      </p>
                    </div>
                    <span className={`pill shrink-0 ${statusTone(inc.status)}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      <span className="text-[10px]">{statusLabel(inc.status)}</span>
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
