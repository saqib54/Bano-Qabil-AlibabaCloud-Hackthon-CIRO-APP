import {
  LayoutDashboard,
  ListChecks,
  History,
  BellRing,
  UserRound
} from 'lucide-react';
import PortalShell from '../components/common/PortalShell';
import StatusPill from '../components/common/StatusPill';
import { useAuthStore } from '../store/auth.store';

const NAV = [
  { to: '/staff/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/staff/incidents', label: 'Assignments', short: 'Tasks', icon: ListChecks },
  { to: '/staff/history', label: 'History', icon: History },
  { to: '/staff/notifications', label: 'Notifications', short: 'Alerts', icon: BellRing },
  { to: '/staff/profile', label: 'Profile', icon: UserRound }
];

export default function StaffLayout() {
  const user = useAuthStore((s) => s.user);
  const dutyStatus = user?.staff_profile?.duty_status || 'OFF_DUTY';

  return (
    <PortalShell
      nav={NAV}
      badge={
        <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
          <p className="text-xs font-medium text-ink-soft">Duty status</p>
          <div className="mt-1">
            <StatusPill value={dutyStatus} label={dutyStatus === 'ON_DUTY' ? 'ON DUTY' : 'OFF DUTY'} />
          </div>
        </div>
      }
    />
  );
}
