import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { notificationApi } from '../../api/notifications.api';
import { getErrorMessage } from '../../api/client';

const SEVERITY_DOT = {
  CRITICAL: 'bg-danger',
  HIGH: 'bg-warn',
  MEDIUM: 'bg-brand',
  LOW: 'bg-ink-soft/40',
  INFO: 'bg-ink-soft/40'
};

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PublicNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    notificationApi.list({ limit: 50 })
      .then((data) => {
        setNotifications(data?.notifications || []);
        setUnreadCount(data?.unreadCount || 0);
      })
      .catch((err) => console.error(getErrorMessage(err, 'Failed to load notifications')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      load();
    } catch (err) { console.error(getErrorMessage(err)); }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      load();
    } catch (err) { console.error(getErrorMessage(err)); }
    finally { setMarkingAll(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50"
          >
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-soft">Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-ink-soft/30" />
          <p className="mt-3 text-sm font-semibold text-ink-soft">No notifications yet</p>
          <p className="mt-1 text-xs text-ink-soft">
            You'll be notified about status changes to your reports and emergency alerts.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-line">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 px-5 py-4 transition hover:bg-surface ${
                !n.is_read ? 'bg-brand-soft/10' : ''
              }`}
            >
              <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[n.severity] || 'bg-ink-soft/40'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold' : 'text-ink'}`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 rounded p-1 text-ink-soft hover:bg-white hover:text-brand"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-soft leading-relaxed">{n.message}</p>
                <p className="mt-1.5 text-[10px] text-ink-soft">{formatWhen(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
