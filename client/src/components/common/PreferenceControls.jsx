import { Moon, Sun, Languages } from 'lucide-react';
import { useSettingsStore } from '../../store/settings.store';
import { useTranslation } from '../../i18n/translations';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Theme + language switcher. Two render styles:
 *  - variant="header"  → compact icon buttons for toolbars/headers
 *  - variant="row"     → labelled rows for the sidebar / drawer
 * tone: 'dark' = for navy surfaces (white text), 'light' = for light surfaces.
 */
export default function PreferenceControls({ variant = 'header', tone = 'dark', className }) {
  const { theme, toggleTheme } = useSettingsStore();
  const { lang, setLang, t } = useTranslation();
  const onDark = tone === 'dark';

  if (variant === 'row') {
    return (
      <div className={cx('space-y-2', className)}>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-white/80">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-aqua" /> : <Sun className="h-4 w-4 text-warn" />}
            {theme === 'dark' ? t('Dark') : t('Light')}
          </span>
          <span className="rounded-lg bg-brand px-2 py-0.5 text-xs font-bold text-white">
            {theme === 'dark' ? 'ON' : 'OFF'}
          </span>
        </button>
        <button
          onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
          className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium text-white/80">
            <Languages className="h-4 w-4 text-aqua" />
            {t('Language')}
          </span>
          <span className="rounded-lg bg-brand px-2 py-0.5 text-xs font-bold text-white">
            {lang === 'en' ? 'اردو' : 'English'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={cx('flex items-center gap-1', className)}>
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cx(
          'rounded-xl p-2 transition active:scale-95',
          onDark
            ? 'text-white/70 hover:bg-white/10 hover:text-white'
            : 'text-navy/60 hover:bg-navy/10 hover:text-navy'
        )}
      >
        {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
      <button
        onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
        title={lang === 'en' ? 'اردو میں دیکھیں' : 'Switch to English'}
        className={cx(
          'rounded-xl p-1.5 text-[11px] font-bold transition active:scale-95',
          onDark
            ? 'text-white/70 hover:bg-white/10 hover:text-white'
            : 'text-navy/60 hover:bg-navy/10 hover:text-navy'
        )}
      >
        {lang === 'en' ? 'اردو' : 'EN'}
      </button>
    </div>
  );
}
