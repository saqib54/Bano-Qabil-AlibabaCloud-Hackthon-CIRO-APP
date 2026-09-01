import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Camera, SwitchCamera, RefreshCw, CheckCircle2 } from 'lucide-react';

/**
 * Live camera capture modal — works on web, Android and iOS browsers
 * (getUserMedia). Streams the device camera, lets the citizen snap a
 * photo and returns it as a File via onCapture(file).
 *
 * Falls back gracefully when camera permission is denied or the
 * device has no camera (caller can still use file upload).
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // rear camera first
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startStream = useCallback(async (mode) => {
    setError('');
    setStarting(true);
    stopStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.message === 'unsupported') {
        setError(
          err.message === 'unsupported'
            ? 'Live camera is not supported in this browser — use photo upload instead.'
            : 'Camera permission denied. Allow camera access in your browser settings, or use photo upload instead.'
        );
      } else {
        setError('Could not start the camera. Close other apps using it, or use photo upload instead.');
      }
    } finally {
      setStarting(false);
    }
  }, [stopStream]);

  useEffect(() => {
    startStream(facingMode);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  function switchCamera() {
    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setFlash(true);
    setTimeout(() => setFlash(false), 220);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopStream();
        onCapture(file);
      },
      'image/jpeg',
      0.88
    );
  }

  function close() {
    stopStream();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-navy-deep shadow-lift ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
            Live Camera
          </p>
          <button
            onClick={close}
            className="tap-target rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
          />
          {flash && <div className="absolute inset-0 z-10 bg-white/90" />}
          {starting && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
              <RefreshCw className="h-6 w-6 animate-spin text-aqua" />
              <p className="text-xs font-semibold uppercase tracking-widest">Starting camera…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="rounded-2xl bg-white/10 p-4 text-center text-sm font-medium text-white/90 ring-1 ring-white/10">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 px-5 py-4">
          <button
            onClick={switchCamera}
            disabled={!!error || starting}
            title="Switch camera"
            className="tap-target flex items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95 disabled:opacity-40"
          >
            <SwitchCamera className="m-2.5 h-5 w-5" />
          </button>
          <button
            onClick={capture}
            disabled={!!error || starting}
            title="Capture photo"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white shadow-glow-danger ring-4 ring-white/20 transition hover:brightness-110 active:scale-90 disabled:opacity-40"
          >
            <Camera className="h-7 w-7" />
          </button>
          <button
            onClick={close}
            className="tap-target flex items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95"
          >
            <CheckCircle2 className="m-2.5 h-5 w-5" />
          </button>
        </div>
        <p className="pb-4 text-center text-[11px] text-white/40">
          Point at the emergency and tap the red button to capture
        </p>
      </div>
    </div>
  );
}
