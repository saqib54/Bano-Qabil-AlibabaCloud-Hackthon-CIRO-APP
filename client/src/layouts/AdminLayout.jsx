import {
  LayoutDashboard,
  Map,
  ListOrdered,
  Send,
  BellRing,
  CheckCheck,
  Users,
  UserCog,
  Building2,
  Truck,
  Home,
  CloudSun,
  BarChart3,
  ScrollText,
  Settings
} from 'lucide-react';
import PortalShell from '../components/common/PortalShell';

const NAV = [
  { to: '/admin/dashboard', label: 'Command Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/admin/map', label: 'Operations Map', short: 'Map', icon: Map },
  { to: '/admin/incidents', label: 'Incidents', short: 'Incidents', icon: ListOrdered },
  { to: '/admin/dispatch', label: 'Smart Dispatch', short: 'Dispatch', icon: Send },
  { to: '/admin/alerts', label: 'Emergency Alerts', icon: BellRing },
  { to: '/admin/resolutions', label: 'Resolutions', icon: CheckCheck },
  { to: '/admin/staff', label: 'Staff', icon: Users },
  { to: '/admin/users', label: 'Accounts', icon: UserCog },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/resources', label: 'Resources', icon: Truck },
  { to: '/admin/shelters', label: 'Shelters', icon: Home },
  { to: '/admin/weather', label: 'Weather', icon: CloudSun },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

export default function AdminLayout() {
  return <PortalShell nav={NAV} accent="danger" />;
}
