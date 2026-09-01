import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Radio, ShieldAlert, Clock } from 'lucide-react';
import { notificationApi } from '../../api/notifications.api';
import { getErrorMessage } from '../../api/client';

const SEVERITY_STYLE = {
  CRITICAL: 'border-danger bg-danger-soft text-danger',
  HIGH: 'border-warn bg-warn-soft text-warn',
  MEDIUM: 'border-brand bg-brand-soft text-brand',
  LOW: 'border-line bg-surface text-ink-soft'
};

const SEVERITY_ICON = {
  CRITICAL: ShieldAlert,
  HIGH: AlertTriangle,
  MEDIUM: Radio,
  LOW: Radio
};

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function PublicAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    notificationApi.alerts()
      .then((data) => setAlerts(data || []))
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load alerts')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Emergency Alerts</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Active emergency broadcasts from the command center
        </p>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="card p-12 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-safe/40" />
          <p className="mt-3 text-sm font-semibold text-safe">No active alerts</p>
          <p className="mt-1 text-xs text-ink-soft">
            There are no emergency broadcasts at this time. You will be notified if an alert is issued for your area.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity] || Radio;
            const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.LOW;
            return (
              <div
                key={alert.id}
                className={`card overflow-hidden border-l-4 ${style.split(' ')[0]}`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.split(' ')[1]}`}>
                      <Icon className={`h-5 w-5 ${style.split(' ')[2]}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style}`}>
                          {alert.severity || 'INFO'}
                        </span>
                        <span className="text-[11px] text-ink-soft flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatWhen(alert.created_at)}
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold">{alert.title}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft whitespace-pre-line">
                        {alert.message}
                      </p>
                      {alert.regions && (
                        <p className="mt-3 text-xs text-ink-soft">
                          <span className="font-semibold">Affected areas:</span> {alert.regions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
