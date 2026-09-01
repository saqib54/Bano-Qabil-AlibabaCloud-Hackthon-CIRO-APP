import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Shows a subtle "Install CIRO App" banner on mobile browsers
 * that support PWA installation (beforeinstallprompt event).
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone;
    if (isStandalone) return;

    // Don't show if user dismissed before
    const dismissed = localStorage.getItem('ciro-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) return;

    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after a delay to not interrupt onboarding
      setTimeout(() => setShowBanner(true), 5000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem('ciro-install-dismissed', Date.now().toString());
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up md:hidden">
      <div className="glass rounded-2xl border border-brand/20 bg-brand-soft/90 p-4 shadow-lift">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Install CIRO App</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Add to home screen for quick access and push notifications.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition active:scale-[0.97]"
              >
                Install Now
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-soft transition active:scale-[0.97]"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="tap-target -mr-1 -mt-1 rounded-lg p-1.5 text-ink-soft transition hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
