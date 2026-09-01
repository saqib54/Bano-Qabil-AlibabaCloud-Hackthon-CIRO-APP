import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Square, Sparkles, Bot, ShieldCheck, Camera, UploadCloud } from 'lucide-react';
import { CATEGORIES } from '../../constants/incidents';
import { incidentsApi } from '../../api/incidents.api';
import { verificationApi } from '../../api/verification.api';
import { getErrorMessage } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from '../../i18n/translations';
import CameraCapture from '../../components/common/CameraCapture';

const MAX_IMAGE_MB = 5;

const PRIORITY_TONE = {
  CRITICAL: 'bg-danger-soft text-danger',
  HIGH: 'bg-warn-soft text-warn',
  MEDIUM: 'bg-brand-soft text-brand',
  LOW: 'bg-surface text-ink-soft'
};

export default function ReportEmergency() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [peopleAffected, setPeopleAffected] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // AI Smart Report (voice-to-report + autofill, §71)
  const recognitionRef = useRef(null);
  const [smartText, setSmartText] = useState('');
  const [listening, setListening] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [speechError, setSpeechError] = useState('');

  async function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser — type your report instead.');
      return;
    }
    // Ask for the mic explicitly first so the browser shows the Allow prompt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setSpeechError(
        'Microphone is blocked. Tap the lock/tune icon in the address bar → Site settings → Microphone → Allow, then try again.'
      );
      return;
    }
    setSpeechError('');
    startRecognition('ur-PK');
  }

  function startRecognition(lang, retried = false) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    // Urdu first; browsers fall back gracefully when the locale is unavailable
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      setSmartText(transcript);
    };
    recognition.onerror = (e) => {
      if (e.error === 'language-not-supported' && !retried) {
        // Some devices lack Urdu speech packs — retry in English
        startRecognition('en-US', true);
        return;
      }
      setListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setSpeechError(
          'Microphone blocked — tap the lock icon in the address bar → Site settings → Microphone → Allow, then try again.'
        );
      } else if (e.error === 'network') {
        setSpeechError('Voice input needs an internet connection — check your network and try again.');
      } else {
        setSpeechError('Could not hear you — check microphone access and try again.');
      }
    };
    recognition.onend = () => {
      setListening(false);
      // Auto-analyse as soon as the voice note finishes
      setSmartText((current) => {
        if (current.trim().length >= 5) runAiAutofill(current.trim());
        return current;
      });
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function runAiAutofill(text) {
    const source = text ?? smartText;
    if (!source || source.trim().length < 5) {
      setSpeechError('Speak or type a few words first, e.g. “Lahore Ring Road par accident, do log injured”.');
      return;
    }
    setSpeechError('');
    setExtracting(true);
    try {
      const result = await verificationApi.extract(source);
      setExtraction(result);
      // Autofill the form — only fill fields the citizen hasn't edited
      if (result.category && result.category !== 'OTHER') setCategory(result.category);
      if (result.locationName && !locationName) setLocationName(result.locationName);
      if (result.peopleAffected && !peopleAffected) setPeopleAffected(String(result.peopleAffected));
      if (!description) setDescription(source.trim());
      if (!title) {
        const catLabel = CATEGORIES.find((c) => c.value === result.category)?.label || 'Emergency';
        setTitle(`${catLabel}${result.locationName ? ` — ${result.locationName}` : ''}`);
      }
    } catch (err) {
      setSpeechError(getErrorMessage(err, 'AI extraction failed — you can still fill the form manually.'));
    } finally {
      setExtracting(false);
    }
  }

  function captureLocation() {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser. Enter coordinates manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow location access or enter coordinates manually.'
            : 'Could not determine your location. Enter coordinates manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  function onImageSelected(e) {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Only JPG, PNG or WEBP images are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`Image is too large — maximum ${MAX_IMAGE_MB} MB.`);
      e.target.value = '';
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    setImagePreview(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Live camera capture — same pipeline as the file picker, but the
  // photo comes straight from the device camera (web/Android/iOS).
  function onCameraCapture(file) {
    setCameraOpen(false);
    setImageError('');
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`Image is too large — maximum ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function validate() {
    const next = {};
    if (!category) next.category = 'Select an emergency category';
    if (title.trim().length < 5) next.title = 'Title must be at least 5 characters';
    if (description.trim().length < 15) next.description = 'Describe the emergency in at least 15 characters';
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) next.latitude = 'Capture GPS or enter a valid latitude';
    if (Number.isNaN(lng) || lng < -180 || lng > 180) next.longitude = 'Capture GPS or enter a valid longitude';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      const incident = await incidentsApi.create(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          latitude,
          longitude,
          locationName: locationName.trim(),
          peopleAffected,
          contactPhone: contactPhone.trim()
        },
        image
      );
      navigate(`/public/incidents/${incident.id}`, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Failed to submit the report. Please try again.'));
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('Report an Emergency')}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Your report goes straight to the city command center. Fill location as
            accurately as possible — it decides which team is dispatched.
          </p>
        </div>
        <Link to="/public/dashboard" className="btn-secondary shrink-0">
          {t('Back')}
        </Link>
      </div>

      {serverError && (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
          {serverError}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* AI Smart Report — voice-to-report + autofill (§71) */}
        <section className="card overflow-hidden border-brand/30">
          <div className="flex items-center gap-2 border-b border-line bg-brand-soft/50 px-5 py-3">
            <Bot className="h-4 w-4 text-brand" />
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand">
              AI Smart Report — speak or type in Urdu, Roman Urdu or English
            </h2>
          </div>
          <div className="space-y-3 p-5">
            <div className="flex items-end gap-2">
              <textarea
                className="input min-h-[76px] flex-1 resize-y"
                dir="auto"
                placeholder="مثال: “Lahore Ring Road par accident hua hai, do log injured hain”"
                value={smartText}
                maxLength={1000}
                onChange={(e) => setSmartText(e.target.value)}
              />
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-card transition active:scale-95 ${
                  listening ? 'animate-pulse bg-danger shadow-glow-danger' : 'bg-brand hover:bg-brand-dark'
                }`}
                title={listening ? 'Stop recording' : 'Voice report'}
              >
                {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
            {listening && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                <span className="h-2 w-2 animate-ping rounded-full bg-danger" /> Listening… bol kar emergency bataiye
              </p>
            )}
            {speechError && <p className="text-xs font-medium text-danger">{speechError}</p>}
            <button
              type="button"
              onClick={() => runAiAutofill()}
              disabled={extracting || !smartText.trim()}
              className="btn-primary w-full rounded-2xl disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {extracting ? 'AI analysing…' : 'AI Autofill My Report'}
            </button>

            {/* Extraction result */}
            {extraction && (
              <div className="space-y-2.5 rounded-2xl bg-peri-soft p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-navy px-2.5 py-1 text-[10px] font-bold text-white">
                    {CATEGORIES.find((c) => c.value === extraction.category)?.label || extraction.category}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${PRIORITY_TONE[extraction.priority] || PRIORITY_TONE.MEDIUM}`}>
                    {extraction.priority} PRIORITY
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-navy">
                    {extraction.categoryConfidence}% confident
                  </span>
                </div>
                <div className="grid gap-1.5 text-xs text-navy/80 sm:grid-cols-2">
                  {extraction.locationName && (
                    <p>📍 Location detected: <b>{extraction.locationName}</b></p>
                  )}
                  {extraction.peopleAffected && (
                    <p>🧑‍🤝‍🧑 People affected: <b>{extraction.peopleAffected}</b></p>
                  )}
                  <p>🚑 Required team: <b>{extraction.suggestedTeam}</b></p>
                </div>
                {/* Instant authority-approved safety instructions */}
                <div className="flex items-start gap-2 rounded-xl bg-safe-soft px-3 py-2.5 text-xs font-medium leading-relaxed text-safe">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  {extraction.safetyResponse}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Category */}
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            1 · What happened?
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-medium transition ${
                  category === c.value
                    ? 'border-danger bg-danger-soft text-danger shadow-card'
                    : 'border-line bg-white text-ink-soft hover:border-danger/40 hover:text-ink'
                }`}
              >
                <span className="text-2xl">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
          {errors.category && <p className="text-xs font-medium text-danger">{errors.category}</p>}
        </section>

        {/* Details */}
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            2 · Emergency details
          </h2>
          <div>
            <label className="label" htmlFor="title">Short title</label>
            <input
              id="title"
              className="input"
              placeholder="e.g. Fire in a shop near Saddar Bazaar"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <p className="mt-1 text-xs font-medium text-danger">{errors.title}</p>}
          </div>
          <div>
            <label className="label" htmlFor="description">What is happening?</label>
            <textarea
              id="description"
              className="input min-h-[110px] resize-y"
              placeholder="Describe what you can see — fire, smoke, injuries, water level, people trapped…"
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs font-medium text-danger">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-ink-soft">{description.length}/2000</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="peopleAffected">People affected (estimate)</label>
              <input
                id="peopleAffected"
                className="input"
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="contactPhone">Contact number</label>
              <input
                id="contactPhone"
                className="input"
                type="tel"
                placeholder="+92 3XX XXXXXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              3 · Location
            </h2>
            <button
              type="button"
              onClick={captureLocation}
              disabled={locating}
              className="btn-primary disabled:opacity-60"
            >
              {locating ? 'Locating…' : '📍 Use my GPS location'}
            </button>
          </div>

          {gpsError && (
            <div className="rounded-xl bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
              {gpsError}
            </div>
          )}
          {gpsAccuracy !== null && latitude && (
            <div className="rounded-xl bg-safe-soft px-3 py-2 text-xs font-medium text-safe">
              ✓ Location captured (accuracy ≈ {gpsAccuracy} m)
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="latitude">Latitude</label>
              <input
                id="latitude"
                className="input"
                placeholder="32.4942"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              {errors.latitude && <p className="mt-1 text-xs font-medium text-danger">{errors.latitude}</p>}
            </div>
            <div>
              <label className="label" htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
                className="input"
                placeholder="74.5311"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
              {errors.longitude && <p className="mt-1 text-xs font-medium text-danger">{errors.longitude}</p>}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="locationName">Landmark / area name (optional)</label>
            <input
              id="locationName"
              className="input"
              placeholder="e.g. Near Ghantaghar Chowk, Sialkot"
              value={locationName}
              maxLength={250}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
        </section>

        {/* Photo evidence */}
        <section className="card space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            4 · {t('Photo evidence (optional)')}
          </h2>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Emergency evidence preview"
                className="max-h-64 rounded-2xl border border-line object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold text-white hover:bg-ink"
              >
                ✕ {t('Remove')}
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-danger/40 bg-danger-soft/40 p-6 text-sm font-semibold text-danger transition hover:border-danger hover:bg-danger-soft"
              >
                <Camera className="h-8 w-8" />
                {t('Open live camera')}
                <span className="text-xs font-normal opacity-70">Capture photo from your camera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface p-6 text-sm text-ink-soft transition hover:border-brand hover:text-brand"
              >
                <UploadCloud className="h-8 w-8" />
                {t('Upload photo')}
                <span className="text-xs">JPG, PNG or WEBP · max {MAX_IMAGE_MB} MB</span>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onImageSelected}
          />
          {imageError && <p className="text-xs font-medium text-danger">{imageError}</p>}
        </section>

        {cameraOpen && (
          <CameraCapture onCapture={onCameraCapture} onClose={() => setCameraOpen(false)} />
        )}

        {/* Submit */}
        <div className="flex flex-col gap-2">
          <button type="submit" disabled={submitting} className="btn-danger w-full py-3.5 text-base disabled:opacity-60">
            {submitting ? t('Submitting report…') : `🚨 ${t('Submit Emergency Report')}`}
          </button>
          <p className="text-center text-xs text-ink-soft">
            False reports waste emergency resources and may be penalised.
          </p>
        </div>
      </form>
    </div>
  );
}
