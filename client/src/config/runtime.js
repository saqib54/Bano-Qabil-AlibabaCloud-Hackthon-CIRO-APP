/**
 * Runtime API configuration.
 *
 * The backend URL is resolved at boot (before any app module runs) so the
 * same build can point at a different API without recompiling:
 *   1. /runtime-config.json { "apiUrl": "https://api.example.com/api/v1" }
 *   2. build-time VITE_API_URL
 *   3. local dev fallback (http://localhost:5000/api/v1)
 */
export async function loadRuntimeConfig() {
  // Try absolute then relative — Android WebView can be picky about either.
  const candidates = [
    `${window.location.origin}/runtime-config.json`,
    './runtime-config.json'
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const cfg = await res.json();
      if (cfg && typeof cfg.apiUrl === 'string' && cfg.apiUrl.trim()) {
        window.__CIRO_API_URL__ = cfg.apiUrl.trim().replace(/\/+$/, '');
        return;
      }
    } catch {
      /* try next candidate */
    }
  }
}

/** Base API URL, safe to read once app modules are evaluated. */
export function apiBaseUrl() {
  return (
    window.__CIRO_API_URL__ ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api/v1'
  );
}
