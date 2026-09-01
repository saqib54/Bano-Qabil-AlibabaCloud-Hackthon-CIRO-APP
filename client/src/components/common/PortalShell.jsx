import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Siren, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { ROLE_LABEL } from '../../constants/roles';
import { useTranslation } from '../../i18n/translations';
import PakistanParticleMap from './PakistanParticleMap';
import PreferenceControls from './PreferenceControls';
import { resolveUploadUrl } from '../../api/profile.api';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Avatar circle — shows the uploaded profile photo, else the initial. */
function UserAvatar({ user, size = 'h-9 w-9 text-sm' }) {
  const src = resolveUploadUrl(user?.avatar_url);
  if (src) {
    return <img src={src} alt={user?.full_name} className={cx('shrink-0 rounded-full object-cover ring-1 ring-white/20', size)} />;
  }
  return (
    <div className={cx('flex shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white', size)}>
      {user?.full_name?.charAt(0) || '?'}
    </div>
  );
}

/**
 * Shared app shell: sidebar on desktop, top header + bottom nav on mobile.
 * Mobile gets a slide-out drawer for full navigation.
 */
export default function PortalShell({ nav, accent = 'brand', badge, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  // Desktop sidebar nav items — prototype navy design (§70)
  const navItems = (items) =>
    items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => setDrawerOpen(false)}
        className={({ isActive }) =>
          cx(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive
              ? 'bg-brand text-white shadow-glow-brand'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          )
        }
      >
        <item.icon className="h-[18px] w-[18px]" />
        <span>{t(item.label)}</span>
      </NavLink>
    ));

  // Bottom tab items — max 5, prioritize items with `short` label
  const bottomTabs = nav.slice(0, 5);

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Sidebar (desktop / tablet) — prototype navy design (§70) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden bg-navy md:flex">
        {/* ambient glow + particle network art */}
        <div className="pointer-events-none absolute -left-16 top-1/3 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <PakistanParticleMap className="pointer-events-none absolute -bottom-12 -left-20 w-[135%] opacity-25" />

        <div className="relative z-10 flex items-center gap-3 px-5 py-5">
          <div className={cx('flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-glow-brand',
            accent === 'danger' ? 'bg-danger' : 'bg-gradient-to-br from-brand to-navy-soft')}>
            <Siren className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-white">CIRO</p>
            <p className="text-xs text-white/50">{ROLE_LABEL[user?.role]}</p>
          </div>
        </div>

        {badge && <div className="relative z-10 px-5 pb-3">{badge}</div>}

        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto px-3 pb-4">{navItems(nav)}</nav>

        {/* Theme + language preferences */}
        <div className="relative z-10 px-4 pb-3">
          <PreferenceControls variant="row" />
        </div>

        <div className="relative z-10 p-4 pt-1">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <UserAvatar user={user} size="h-9 w-9 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
              <p className="truncate text-xs text-white/50">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-navy/95 px-4 py-3 backdrop-blur-xl md:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button
          onClick={() => setDrawerOpen(true)}
          className="tap-target -ml-1 rounded-xl p-2 text-white transition active:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className={cx('flex h-8 w-8 items-center justify-center rounded-xl text-white',
            accent === 'danger' ? 'bg-danger' : 'bg-brand')}>
            <Siren className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold text-white">CIRO</p>
        </div>
        <div className="flex items-center gap-1">
          <PreferenceControls variant="header" />
          <NavLink
            to={nav[nav.length - 1]?.to}
            className="tap-target rounded-xl p-2 transition active:bg-white/10"
          >
            <UserAvatar user={user} size="h-8 w-8 text-xs" />
          </NavLink>
        </div>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div className={cx(
        'fixed inset-y-0 left-0 z-50 w-[280px] flex-col bg-navy shadow-lift transition-transform duration-300 md:hidden flex',
        drawerOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 pb-4"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <div className={cx('flex h-10 w-10 items-center justify-center rounded-2xl text-white',
              accent === 'danger' ? 'bg-danger' : 'bg-brand')}>
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">CIRO</p>
              <p className="text-xs text-white/50">{ROLE_LABEL[user?.role]}</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="tap-target rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User card */}
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <UserAvatar user={user} size="h-10 w-10 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.full_name}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
        </div>

        {badge && <div className="px-4 pb-3">{badge}</div>}

        {/* Theme + language preferences */}
        <div className="px-4 pb-3">
          <PreferenceControls variant="row" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition active:scale-[0.98]',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-white/60 active:bg-white/10'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1 text-white">{t(item.label)}</span>
              <ChevronRight className="h-4 w-4 text-white opacity-30" />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/70 transition active:bg-white/10 active:text-white"
          >
            <LogOut className="h-5 w-5" />
            {t('Sign out')}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="px-4 pt-5 md:ml-64 md:px-8 md:pt-8"
        style={{ paddingBottom: nav.length > 5 ? '5.5rem' : '5rem' }}>
        <div className="mx-auto max-w-7xl">{children ?? <Outlet />}</div>
      </main>

      {/* ── Bottom navigation (mobile) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="grid border-t border-line bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#101A30]/95"
          style={{ gridTemplateColumns: `repeat(${Math.min(bottomTabs.length, 5)}, minmax(0, 1fr))` }}>
          {bottomTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition',
                  isActive ? 'text-brand' : 'text-ink-soft dark:text-slate-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cx(
                    'flex h-8 w-12 items-center justify-center rounded-xl transition',
                    isActive && 'bg-brand/10'
                  )}>
                    <item.icon className={cx('h-5 w-5 transition', isActive && 'scale-110')} />
                  </div>
                  <span>{t(item.short || item.label)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
