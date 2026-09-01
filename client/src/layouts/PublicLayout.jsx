import {
  LayoutDashboard,
  Siren,
  Map,
  ClipboardList,
  MessageCircle,
  CloudSun,
  BellRing,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import PortalShell from '../components/common/PortalShell';

const NAV = [
  { to: '/public/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/public/report', label: 'Report Emergency', short: 'Report', icon: Siren },
  { to: '/public/map', label: 'Safety Map', short: 'Map', icon: Map },
  { to: '/public/incidents', label: 'My Reports', short: 'Reports', icon: ClipboardList },
  { to: '/public/assistant', label: 'Ask CIRO AI', short: 'AI', icon: MessageCircle },
  { to: '/public/weather', label: 'Weather', short: 'Weather', icon: CloudSun },
  { to: '/public/alerts', label: 'Alerts', icon: BellRing },
  { to: '/public/safe-places', label: 'Safe Places', icon: ShieldCheck },
  { to: '/public/profile', label: 'Profile', icon: UserRound }
];

export default function PublicLayout() {
  return <PortalShell nav={NAV} />;
}
