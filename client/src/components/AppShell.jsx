import { useEffect, useState } from 'react';
import Onboarding, { isOnboardingComplete, completeOnboarding } from './Onboarding';
import InstallPrompt from './InstallPrompt';
import { useAuthStore } from '../store/auth.store';
import { profileApi } from '../api/profile.api';

/**
 * AppShell wraps the entire application and manages the startup sequence:
 * 1. Splash screen (HTML-native, shown before React)
 * 2. Terms & consent onboarding — shown once; for logged-in citizens the
 *    acceptance is saved on their account, so it never shows again
 *    (even on a different device/browser).
 * 3. Normal app
 */
export default function AppShell({ children }) {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Small delay to let React hydrate, then hide HTML splash
    const timer = setTimeout(() => {
      const splash = document.getElementById('ciro-splash');
      if (splash) splash.classList.add('hidden');

      // After splash fades, decide whether the terms flow is needed
      setTimeout(() => {
        const acceptedOnAccount = Boolean(user?.terms_accepted_at);
        if (!acceptedOnAccount && !isOnboardingComplete()) {
          setShowOnboarding(true);
        }
        setReady(true);
      }, 500);
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOnboardingComplete() {
    setShowOnboarding(false);
    completeOnboarding(); // local fallback for guests

    // Logged in → persist acceptance on the account so the popup never
    // returns for this citizen, on any device.
    if (user) {
      try {
        const updated = await profileApi.acceptTerms();
        useAuthStore.setState((s) => ({ user: { ...s.user, ...updated } }));
      } catch (_err) {
        /* offline — acceptance will be recorded on next successful call */
      }
    }
  }

  return (
    <>
      {children}
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      {!showOnboarding && <InstallPrompt />}
    </>
  );
}
