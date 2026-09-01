import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { notificationApi } from '../../api/notifications.api';
import { getErrorMessage } from '../../api/client';

const SEVERITY_ICON = {
  CRITICAL: 'text-danger',
  HIGH: 'text-warn',
  MEDIUM: 'text-brand',
  LOW: 'text-ink-soft',
  INFO: 'text-ink-soft'
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
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function NotificationBell({ role }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    notificationApi.list({ limit: 10 })
      .then((data) => {
        setNotifications(data?.notifications || []);
        setUnreadCount(data?.unreadCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      load();
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      load();
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    if (role === 'STAFF') navigate('/staff/notifications');
    else navigate('/public/notifications');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-ink-soft transition hover:bg-surface"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-xl sm:w-96">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="rounded p-0.5 text-ink-soft hover:bg-surface">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-soft">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="mx-auto h-6 w-6 text-ink-soft/40" />
                  <p className="mt-2 text-sm text-ink-soft">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-line/50 px-4 py-3 transition hover:bg-surface ${
                      !n.is_read ? 'bg-brand-soft/20' : ''
                    }`}
                  >
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_ICON[n.severity] || 'bg-ink-soft'} ${
                      !n.is_read ? 'mt-1.5 h-2 w-2' : 'mt-1.5'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{n.message}</p>
                      <p className="mt-1 text-[10px] text-ink-soft">{formatWhen(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="shrink-0 self-start rounded p-1 text-ink-soft hover:bg-surface hover:text-brand"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-line px-4 py-2.5 text-center">
              <button
                onClick={handleViewAll}
                className="text-xs font-semibold text-brand hover:underline"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
