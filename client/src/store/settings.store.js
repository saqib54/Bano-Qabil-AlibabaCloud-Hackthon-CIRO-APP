import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global UI preferences — theme (light/dark) and language (en/ur).
 * Persisted locally to localStorage AND synced to the user's account
 * (server-side `prefs`), so a citizen's choices follow them across
 * devices: on login the saved account preferences are restored.
 */

const API_BASE =
  window.__CIRO_API_URL__ || import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#2563EB');
}

function applyLang(lang) {
  const root = document.documentElement;
  root.setAttribute('lang', lang);
  root.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
  root.classList.toggle('rtl', lang === 'ur');
}

/** Read the persisted auth session straight from localStorage (avoids import cycles). */
function getAuthSession() {
  try {
    const raw = localStorage.getItem('ciro-auth');
    if (!raw) return null;
    return JSON.parse(raw)?.state || null;
  } catch {
    return null;
  }
}

let syncTimer = null;

/** Debounced push of the current preferences to the account (when logged in). */
function queueServerSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const session = getAuthSession();
    if (!session?.accessToken || !session?.user) return;
    const { theme, lang } = useSettingsStore.getState();
    try {
      await fetch(`${API_BASE}/users/prefs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ prefs: { theme, lang } })
      });
    } catch {
      /* offline — preferences stay saved locally and sync on next change */
    }
  }, 800);
}

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      lang: 'en',

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
        queueServerSync();
      },

      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
        queueServerSync();
      },

      setLang: (lang) => {
        applyLang(lang);
        set({ lang });
        queueServerSync();
      },

      /**
       * Restore preferences stored on the user's account (after login or on
       * app boot with a restored session). Account values win over local ones.
       */
      hydrateFromUser: (user) => {
        const prefs = user?.prefs;
        if (!prefs || typeof prefs !== 'object') return;
        const changes = {};
        if (prefs.theme === 'dark' || prefs.theme === 'light') {
          changes.theme = prefs.theme;
          applyTheme(prefs.theme);
        }
        if (prefs.lang === 'en' || prefs.lang === 'ur') {
          changes.lang = prefs.lang;
          applyLang(prefs.lang);
        }
        if (Object.keys(changes).length > 0) set(changes);
      }
    }),
    {
      name: 'ciro-settings',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyTheme(state.theme);
        applyLang(state.lang);
      }
    }
  )
);

// Apply persisted preferences on boot (localStorage rehydrate is synchronous)
applyTheme(useSettingsStore.getState().theme);
applyLang(useSettingsStore.getState().lang);
