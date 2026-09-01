import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

// CIRO Firebase project (alibaba-cloud-hackthon). Real Google sign-in:
// the popup flow needs no localhost origin config — the OAuth redirect goes
// through <project>.firebaseapp.com. The minted Firebase ID token is verified
// server-side via Google tokeninfo (aud = project id, iss = securetoken).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAjICm0QOpxqg8qIUCLG7LWZX_49AY7CGY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'alibaba-cloud-hackthon.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'alibaba-cloud-hackthon',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'alibaba-cloud-hackthon.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID || '11990113712',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:11990113712:web:942f4323f67154633fca75'
};

const app = getApps().length ? getApp() : initializeApp(config);
export const firebaseAuth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Native Android: the Firebase auto-created web OAuth client. Used by the
// cordova-plugin-googleplus bridge (native Google account picker, no popup).
const NATIVE_WEB_CLIENT_ID = '11990113712-8nur4mhqhht4rbngku0cskjt56tl1hjm.apps.googleusercontent.com';

/**
 * Real Google sign-in. On native (Capacitor/Android) the popup API is
 * unavailable, so we use the native Google account picker and exchange the
 * returned Google ID token for a Firebase ID token via signInWithCredential —
 * the same token kind the backend accepts at POST /auth/google.
 */
export async function signInWithGooglePopup() {
  if (Capacitor.isNativePlatform()) {
    const googleplus = window.plugins?.googleplus;
    if (!googleplus) throw new Error('Google sign-in plugin unavailable on this device');
    const profile = await googleplus.login({
      scopes: 'profile email',
      webClientId: NATIVE_WEB_CLIENT_ID,
      offline: false
    });
    // Exchange for a Firebase ID token (verified server-side via x509 certs)
    const credential = GoogleAuthProvider.credential(profile.idToken);
    const result = await signInWithCredential(firebaseAuth, credential);
    const idToken = await result.user.getIdToken();
    return { idToken };
  }

  const result = await signInWithPopup(firebaseAuth, googleProvider);
  const idToken = await result.user.getIdToken();
  return { idToken };
}
