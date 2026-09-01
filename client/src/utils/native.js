import { Capacitor } from '@capacitor/core';

/**
 * On native platforms (Android APK / iOS) request the OS-level runtime
 * permissions the web features rely on: camera (live capture, avatar)
 * and location (weather + nearby shelters). No-op in the browser.
 */
export async function requestNativePermissions() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { Camera } = await import('@capacitor/camera');
    await Camera.requestPermissions({ permissions: ['camera'] });
  } catch {
    /* plugin unavailable — web getUserMedia flow will prompt as it can */
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
  } catch {
    /* plugin unavailable */
  }
}
