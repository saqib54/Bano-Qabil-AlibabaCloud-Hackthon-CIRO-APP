const TONES = {
  CRITICAL: 'bg-danger-soft text-danger',
  HIGH: 'bg-warn-soft text-warn',
  MEDIUM: 'bg-warn-soft text-warn',
  LOW: 'bg-brand-soft text-brand',
  RESOLVED: 'bg-safe-soft text-safe',
  ACTIVE: 'bg-brand-soft text-brand',
  ON_DUTY: 'bg-safe-soft text-safe',
  OFF_DUTY: 'bg-surface text-ink-soft',
  ADVISORY: 'bg-brand-soft text-brand'
};

export default function StatusPill({ value, label }) {
  const tone = TONES[value] || 'bg-surface text-ink-soft';
  return (
    <span className={`pill ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || value}
    </span>
  );
}
