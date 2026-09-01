import { useEffect, useState } from 'react';
import { Siren, X, Zap } from 'lucide-react';
import { notificationApi } from '../../api/notifications.api';
import { useRealtime } from '../../hooks/useRealtime';

/** Severity presentation for alert banners. */
const SEVERITY_STYLE = {
  CRITICAL: {
    wrapper: 'border-danger/40 bg-gradient-to-r from-danger/15 via-danger/10 to-transparent',
    icon: 'bg-danger text-white animate-pulse',
    chip: 'bg-danger text-white',
    label: 'CRITICAL'
  },
  HIGH: {
    wrapper: 'border-warn/40 bg-gradient-to-r from-warn/15 via-warn/10 to-transparent',
    icon: 'bg-warn text-white',
    chip: 'bg-warn text-white',
    label: 'HIGH'
  },
  MEDIUM: {
    wrapper: 'border-brand/30 bg-gradient-to-r from-brand/10 to-transparent',
    icon: 'bg-brand text-white',
    chip: 'bg-brand text-white',
    label: 'ADVISORY'
  },
  LOW: {
    wrapper: 'border-line bg-surface',
    icon: 'bg-ink-soft text-white',
    chip: 'bg-ink-soft text-white',
    label: 'NOTICE'
  }
};

function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T') + 'Z');
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

/**
 * Live emergency alert banner — shows active broadcasts and receives
 * new alerts in real time over WebSocket the second they are issued
 * (by command staff or automatically by the AI verification pipeline).
 */
export default function AlertTicker({ maxVisible = 2 }) {
  const [alerts, setAlerts] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());

  // Initial load of active alerts
  useEffect(() => {
    notificationApi
      .alerts()
      .then((rows) => setAlerts(rows || []))
      .catch(() => setAlerts([]));
    // Refresh the active-alert list periodically as a safety net
    const interval = setInterval(() => {
      notificationApi
        .alerts()
        .then((rows) => setAlerts(rows || []))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Real-time push — new alerts land here instantly
  useRealtime({
    'alert.new': (event) => {
      const alert = event.alert;
      if (!alert) return;
      setAlerts((prev) => [alert, ...(prev || []).filter((a) => a.id !== alert.id)]);
    }
  });

  if (!alerts) return null;

  const visible = alerts
    .filter((a) => !dismissed.has(a.id))
    .sort((a, b) => {
      const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return (rank[a.severity] ?? 4) - (rank[b.severity] ?? 4);
    })
    .slice(0, maxVisible);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {visible.map((alert) => {
        const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.MEDIUM;
        const isAi = alert.source === 'AI_PIPELINE';
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-card ${style.wrapper}`}
            role="alert"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
              <Siren className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${style.chip}`}>
                  {style.label}
                </span>
                <p className="text-sm font-bold text-ink">{alert.title}</p>
                {isAi && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-bold text-brand">
                    <Zap className="h-2.5 w-2.5" /> AI-VERIFIED
                  </span>
                )}
                <span className="text-[10px] text-ink-soft">{timeAgo(alert.created_at)}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
              className="tap-target rounded-lg p-1.5 text-ink-soft/60 transition hover:bg-white/60 hover:text-ink"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
