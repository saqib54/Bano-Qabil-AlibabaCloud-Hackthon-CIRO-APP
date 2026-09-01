/**
 * Incident domain metadata — categories and status presentation.
 * Values mirror server validators/migrations exactly.
 */

export const CATEGORIES = [
  { value: 'FIRE', label: 'Fire', emoji: '🔥' },
  { value: 'FLOOD', label: 'Flood', emoji: '🌊' },
  { value: 'ACCIDENT', label: 'Road Accident', emoji: '🚗' },
  { value: 'MEDICAL', label: 'Medical', emoji: '🚑' },
  { value: 'POWER_OUTAGE', label: 'Power Outage', emoji: '⚡' },
  { value: 'BUILDING_COLLAPSE', label: 'Building Collapse', emoji: '🏚️' },
  { value: 'GAS_LEAK', label: 'Gas Leak', emoji: '💨' },
  { value: 'SECURITY', label: 'Security Threat', emoji: '🚨' },
  { value: 'EXTREME_WEATHER', label: 'Extreme Weather', emoji: '🌪️' },
  { value: 'OTHER', label: 'Other', emoji: '📋' }
];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

export const CATEGORY_EMOJI = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.emoji])
);

/** Status presentation — label + pill tone for each workflow state (§24). */
export const STATUS_META = {
  REPORTED: { label: 'Reported', tone: 'bg-brand-soft text-brand' },
  AI_ANALYZED: { label: 'AI Analyzed', tone: 'bg-brand-soft text-brand' },
  UNDER_REVIEW: { label: 'Under Review', tone: 'bg-warn-soft text-warn' },
  VERIFIED: { label: 'Verified', tone: 'bg-brand-soft text-brand' },
  ASSIGNED: { label: 'Team Assigned', tone: 'bg-brand-soft text-brand' },
  ACCEPTED: { label: 'Accepted', tone: 'bg-brand-soft text-brand' },
  EN_ROUTE: { label: 'Team En Route', tone: 'bg-warn-soft text-warn' },
  ON_SCENE: { label: 'Team On Scene', tone: 'bg-warn-soft text-warn' },
  RESOLUTION_SUBMITTED: { label: 'Resolution Submitted', tone: 'bg-brand-soft text-brand' },
  RESOLVED: { label: 'Resolved', tone: 'bg-safe-soft text-safe' },
  REJECTED: { label: 'Rejected', tone: 'bg-danger-soft text-danger' },
  DUPLICATE: { label: 'Duplicate', tone: 'bg-surface text-ink-soft' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-surface text-ink-soft' },
  REOPENED: { label: 'Reopened', tone: 'bg-danger-soft text-danger' }
};

export function statusLabel(status) {
  return STATUS_META[status]?.label || status;
}

export function statusTone(status) {
  return STATUS_META[status]?.tone || 'bg-surface text-ink-soft';
}

/** Citizen-friendly explanation of what each status means right now. */
export const STATUS_HINT = {
  REPORTED: 'Your report has been received and is waiting for review.',
  AI_ANALYZED: 'AI triage completed — command center will review shortly.',
  UNDER_REVIEW: 'The command center is verifying your report.',
  VERIFIED: 'Your report is verified as a real emergency.',
  ASSIGNED: 'A response team has been assigned to your report.',
  ACCEPTED: 'The response team accepted the mission.',
  EN_ROUTE: 'Help is on the way to your location.',
  ON_SCENE: 'The response team has arrived at the location.',
  RESOLUTION_SUBMITTED: 'The team submitted resolution proof — awaiting final review.',
  RESOLVED: 'This emergency has been resolved. Thank you for reporting.',
  REJECTED: 'This report was rejected after review.',
  DUPLICATE: 'This incident was already reported by someone else.',
  CANCELLED: 'This report was cancelled.',
  REOPENED: 'This incident was reopened for further action.'
};
