export default function KpiCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    danger: 'bg-danger-soft text-danger',
    safe: 'bg-safe-soft text-safe',
    warn: 'bg-warn-soft text-warn',
    neutral: 'bg-surface text-ink-soft'
  };

  return (
    <div className="card flex items-start gap-4 p-5">
      {Icon && (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight">{value ?? '—'}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-ink-soft">{label}</p>
        {hint && <p className="mt-1 text-xs text-ink-soft/80">{hint}</p>}
      </div>
    </div>
  );
}
