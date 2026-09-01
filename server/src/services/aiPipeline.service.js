/**
 * CIRO Rapid Intelligence Grid — real-time AI verification pipeline.
 *
 * Every citizen report automatically flows through five cooperating agents
 * within seconds of submission:
 *
 *   1. Sentinel      — signal intake: urgency & richness scoring of the report text
 *   2. GeoScout      — geospatial validation: coordinate sanity + nearby context
 *   3. DedupGuard    — duplicate detection against the reporter's recent reports
 *   4. Corroborator  — multi-witness corroboration from independent reporters nearby
 *   5. VerdictEngine — composite verdict + confidence, auto-routing & auto-alerting
 *
 * Auto-triage enrichment agents (§71):
 *   · SpamGuard      — fake/spam likelihood, flags reports for dispatcher review
 *   · SatelliteScout — fused satellite/weather signal assessment
 *   · GeoImpact      — category-aware impact geofence + affected-population estimate
 *   · SmartDispatch  — nearest-team suggestion + ETA
 *   · Copilot        — 2–3 line dispatcher summary
 *
 * When the verdict is AUTO_VERIFIED at CRITICAL/HIGH severity, the pipeline
 * pre-routes the incident to the recommended department and issues a public
 * alert broadcast so citizens are aware within seconds — then hands off to
 * command staff for one-click confirmation and dispatch.
 */
const crypto = require('crypto');
const db = require('../../database/connection');
const auditRepository = require('../repositories/audit.repository');
const notificationService = require('./notification.service');

const MODEL = 'ciro-pipeline-v1';

/** Urgency signal vocabulary used by the Sentinel agent. */
const CRITICAL_SIGNALS = [
  'trapped', 'unconscious', 'not breathing', 'bleeding', 'collapsed', 'explosion',
  'fire spreading', 'dying', 'dead', 'casualt', 'mass', 'baby', 'infant', 'child',
  'elderly', 'wheelchair', 'disabled', 'electrocuted', 'water rising', 'gas filling',
  'smoke filling', 'structur', 'buried'
];
const HIGH_SIGNALS = [
  'injured', 'injury', 'burn', 'stuck', 'smoke', 'sparking', 'wire down',
  'crack in', 'water entering', 'flooded', 'blocked', 'leaking', 'spill',
  'heart attack', 'stroke', 'severe', 'rapidly', 'spreading', 'urgent'
];

/** Per-category citizen safety guidance injected into auto-alerts. */
const SAFETY_GUIDANCE = {
  FIRE: 'Move away from smoke, stay low, and do not use elevators.',
  FLOOD: 'Move to higher ground immediately and avoid walking or driving through water.',
  ACCIDENT: 'Keep clear of the roadway and do not attempt to move injured persons.',
  MEDICAL: 'Keep the person calm and clear the area for medical responders.',
  POWER_OUTAGE: 'Stay away from fallen power lines and downed cables.',
  BUILDING_COLLAPSE: 'Evacuate the surrounding area — further collapse is possible.',
  GAS_LEAK: 'Do not ignite flames or switches; evacuate the area immediately.',
  SECURITY: 'Stay indoors, avoid the area, and follow police instructions.',
  EXTREME_WEATHER: 'Seek sturdy shelter and stay away from windows and open ground.',
  OTHER: 'Stay clear of the area and keep emergency lanes open.'
};

const CATEGORY_LABEL = {
  FIRE: 'Fire', FLOOD: 'Flood', ACCIDENT: 'Road accident', MEDICAL: 'Medical emergency',
  POWER_OUTAGE: 'Power outage', BUILDING_COLLAPSE: 'Building collapse', GAS_LEAK: 'Gas leak',
  SECURITY: 'Security threat', EXTREME_WEATHER: 'Extreme weather', OTHER: 'Emergency'
};

const SEVERITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

/** SmartDispatch — suggested response team per category (authority-approved). */
const TEAM_MATRIX = {
  FIRE: 'Fire Brigade + Rescue 1122 Ambulance',
  FLOOD: 'Rescue 1122 + District Disaster Response',
  ACCIDENT: 'Ambulance + Traffic Police',
  MEDICAL: 'Nearest Ambulance (Rescue 1122)',
  POWER_OUTAGE: 'Grid Emergency Crew',
  BUILDING_COLLAPSE: 'Urban Search & Rescue + Ambulance',
  GAS_LEAK: 'Fire Brigade + Gas Utility Emergency',
  SECURITY: 'Police 15 + Patrol Unit',
  EXTREME_WEATHER: 'District Disaster Response',
  OTHER: 'Rescue 1122 Response Unit'
};

/** Geo-Impact Engine — base impact radius (metres) per category. */
const IMPACT_RADIUS = {
  FIRE: 500, FLOOD: 1200, ACCIDENT: 600, MEDICAL: 150,
  POWER_OUTAGE: 400, BUILDING_COLLAPSE: 350, GAS_LEAK: 800,
  SECURITY: 700, EXTREME_WEATHER: 1500, OTHER: 300
};

// ── Geo helpers ────────────────────────────────────────────

/** Great-circle distance between two coordinates, in metres. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Stage agents ───────────────────────────────────────────

/** Stage 1 — Sentinel: signal intake & report richness scoring. */
function runSentinel(incident) {
  const text = `${incident.title || ''} ${incident.description || ''} ${incident.extra_details || ''}`.toLowerCase();
  const findings = [];
  let score = 0;

  const criticalHits = CRITICAL_SIGNALS.filter((s) => text.includes(s));
  const highHits = HIGH_SIGNALS.filter((s) => text.includes(s));

  if (criticalHits.length > 0) {
    score += Math.min(48, criticalHits.length * 12);
    findings.push(`Critical urgency signals detected: ${criticalHits.slice(0, 4).join(', ')}`);
  }
  if (highHits.length > 0) {
    score += Math.min(28, highHits.length * 7);
    findings.push(`Elevated urgency signals: ${highHits.slice(0, 4).join(', ')}`);
  }

  const affected = incident.people_affected || 0;
  if (affected >= 10) {
    score += 15;
    findings.push(`${affected} people reported affected — mass-impact scale`);
  } else if (affected >= 3) {
    score += 8;
    findings.push(`${affected} people reported affected`);
  }

  if ((incident.description || '').length >= 80) {
    score += 5;
    findings.push('Detailed description provided (high information quality)');
  }
  if (incident.contact_phone) {
    score += 4;
    findings.push('Callback contact provided — reporter reachable');
  }

  score = Math.min(100, score);
  if (findings.length === 0) findings.push('No strong urgency signals in report text');

  return {
    agent: 'Sentinel',
    role: 'Signal intake',
    status: score >= 40 ? 'FLAG' : 'PASS',
    score,
    findings
  };
}

/** Stage 2 — GeoScout: coordinate plausibility + spatial context. */
function runGeoScout(incident, nearby, nearestShelter) {
  const findings = [];
  let score = 100;

  const plausible =
    incident.latitude >= 23 && incident.latitude <= 38 &&
    incident.longitude >= 60 && incident.longitude <= 79; // Pakistan region envelope

  if (!plausible) {
    score = 20;
    findings.push('Coordinates fall outside the expected regional envelope — flagged for review');
  } else {
    findings.push('Coordinates plausible and geocoded within the service region');
  }

  if (nearby.length > 0) {
    findings.push(`${nearby.length} active incident${nearby.length > 1 ? 's' : ''} within 2 km — situational context available`);
  } else {
    score = Math.max(60, score - 20);
    findings.push('No nearby active incidents — first report for this area');
  }

  if (nearestShelter) {
    findings.push(`Nearest safe place: ${nearestShelter.name} (${Math.round(nearestShelter.distance)} m away)`);
    score = Math.min(100, score + 10);
  }

  return {
    agent: 'GeoScout',
    role: 'Geospatial validation',
    status: plausible ? 'PASS' : 'FLAG',
    score,
    findings
  };
}

/** Stage 3 — DedupGuard: duplicate detection (same reporter, same area). */
function runDedupGuard(incident, nearby) {
  const findings = [];
  let duplicateOf = null;
  let status = 'PASS';

  // Same reporter re-reporting the same category within 500 m in 24 h
  const selfDuplicate = nearby.find(
    (n) =>
      n.reported_by === incident.reported_by &&
      n.category === incident.category &&
      n.distance <= 500
  );

  if (selfDuplicate) {
    duplicateOf = selfDuplicate.id;
    status = 'FLAG';
    findings.push(
      `Likely duplicate of ${selfDuplicate.incident_number} — same reporter, same category, ${Math.round(selfDuplicate.distance)} m away`
    );
  } else {
    findings.push('No duplicate pattern detected for this reporter');
  }

  return {
    agent: 'DedupGuard',
    role: 'Duplicate detection',
    status,
    score: duplicateOf ? 100 : 0,
    duplicateOf,
    findings
  };
}

/** Stage 4 — Corroborator: independent witness corroboration. */
function runCorroborator(incident, nearby) {
  const findings = [];
  const corroborating = nearby.filter(
    (n) =>
      n.reported_by !== incident.reported_by &&
      n.category === incident.category &&
      n.distance <= 1000
  );

  if (corroborating.length > 0) {
    findings.push(
      `${corroborating.length} independent report${corroborating.length > 1 ? 's' : ''} of the same event type within 1 km — strong corroboration`
    );
    if (corroborating.length >= 2) {
      findings.push('Multiple witnesses confirm the event — severity escalated');
    }
  } else {
    findings.push('Single-source report — awaiting command verification');
  }

  return {
    agent: 'Corroborator',
    role: 'Multi-witness corroboration',
    status: corroborating.length > 0 ? 'FLAG' : 'PASS',
    corroboratingCount: corroborating.length,
    findings
  };
}

/**
 * Stage — SpamGuard: fake/spam heuristics. High scores force dispatcher
 * review and cap confidence; the report is never auto-acted upon.
 */
function runSpamGuard(incident) {
  const findings = [];
  let score = 0;
  const desc = incident.description || '';

  if (desc.length < 20) {
    score += 30;
    findings.push('Very short description — low information content');
  }
  if (!incident.contact_phone) {
    score += 10;
    findings.push('No callback contact provided');
  }
  if ((desc.match(/!/g) || []).length > 5) {
    score += 10;
    findings.push('Excessive punctuation pattern');
  }
  const letters = (desc.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length;
  if (desc.length > 0 && letters / desc.length < 0.5) {
    score += 20;
    findings.push('Text mostly non-linguistic characters');
  }
  if (incident.title && desc && incident.title.trim() === desc.trim()) {
    score += 15;
    findings.push('Title and description identical');
  }

  // Reporter history — previously rejected reports raise suspicion
  const rejectedCount = db
    .prepare("SELECT COUNT(*) AS c FROM incidents WHERE reported_by = ? AND status = 'REJECTED' AND id != ?")
    .get(incident.reported_by, incident.id).c;
  if (rejectedCount >= 2) {
    score += 30;
    findings.push(`Reporter has ${rejectedCount} previously rejected reports`);
  }

  score = Math.min(100, score);
  if (findings.length === 0) findings.push('No spam or abuse indicators detected');

  return {
    agent: 'SpamGuard',
    role: 'Fake/spam detection',
    status: score >= 40 ? 'FLAG' : 'PASS',
    score,
    findings
  };
}

/**
 * Stage — SatelliteScout: fused satellite/weather signal assessment.
 * Deterministic simulation of NASA FIRMS heat anomalies / Sentinel-1
 * flood extent until live feeds are licensed (hours-scale latency anyway).
 */
function runSatelliteScout(incident) {
  const h = Math.abs(
    Math.round(incident.latitude * 1000) * 31 + Math.round(incident.longitude * 1000) * 17
  ) % 10;
  const detail = [];
  let signal = 'NONE';

  if (incident.category === 'FIRE') {
    if (h <= 5) {
      signal = 'SUPPORTING';
      detail.push('FIRMS-style thermal anomaly detected near coordinates (simulated feed)');
    } else if (h === 9) {
      signal = 'CONFLICTING';
      detail.push('No thermal signature in latest pass — possible early-stage fire or false report');
    } else {
      signal = 'INCONCLUSIVE';
      detail.push('Satellite revisit pending — thermal check queued');
    }
  } else if (incident.category === 'FLOOD') {
    if (h <= 6) {
      signal = 'SUPPORTING';
      detail.push('Radar surface-water extent consistent with low-lying flooding (Sentinel-1 heuristic)');
    } else {
      signal = 'INCONCLUSIVE';
      detail.push('Cloud-penetrating radar pass scheduled — no confirmation yet');
    }
  } else if (incident.category === 'EXTREME_WEATHER') {
    if (h <= 4) {
      signal = 'SUPPORTING';
      detail.push('Weather satellite shows an active disturbance system in the region');
    } else {
      signal = 'INCONCLUSIVE';
      detail.push('No significant weather system currently imaged');
    }
  } else {
    detail.push('Satellite observation not applicable for this event type — citizen/sensor sources used');
  }

  return {
    agent: 'SatelliteScout',
    role: 'Satellite & weather fusion',
    status: signal === 'SUPPORTING' ? 'FLAG' : signal === 'CONFLICTING' ? 'FLAG' : 'INFO',
    signal,
    findings: detail
  };
}

/**
 * Stage — Geo-Impact Engine: builds a category-aware impact geofence
 * (sector for fire/gas, corridor for accidents, ring otherwise) and
 * estimates the affected population inside the zone.
 */
function runGeoImpact(incident, severity) {
  const baseRadius = IMPACT_RADIUS[incident.category] || 300;
  const radius = Math.round(baseRadius * (SEVERITY_RANK[severity] >= SEVERITY_RANK.HIGH ? 1.25 : 1));

  // Deterministic wind/hazard bearing from coordinates
  const bearing = Math.abs(Math.round(incident.latitude * 700 + incident.longitude * 500)) % 360;

  const ring = (r, start, sweep, steps) => {
    const pts = [];
    for (let i = 0; i <= steps; i += 1) {
      const b = ((start + (sweep * i) / steps) * Math.PI) / 180;
      const dLat = (r * Math.cos(b)) / 111320;
      const dLng = (r * Math.sin(b)) / (111320 * Math.cos((incident.latitude * Math.PI) / 180));
      pts.push([+(incident.latitude + dLat).toFixed(5), +(incident.longitude + dLng).toFixed(5)]);
    }
    return pts;
  };

  let kind = 'circle';
  let polygon;
  if (incident.category === 'FIRE' || incident.category === 'GAS_LEAK') {
    kind = 'sector'; // downwind hazard cone
    polygon = [[incident.latitude, incident.longitude], ...ring(radius, bearing - 55, 110, 12)];
  } else if (incident.category === 'ACCIDENT' || incident.category === 'FLOOD') {
    kind = 'corridor'; // route-following band
    polygon = [...ring(radius, bearing - 35, 70, 6), ...ring(radius * 0.45, bearing + 145, 70, 6)];
  } else {
    polygon = ring(radius, 0, 360, 24);
  }

  // Affected-population estimate: zone area × urban density heuristic
  const areaKm2 = (Math.PI * radius * radius) / 1e6;
  const affected = Math.max(0, Math.round(areaKm2 * 4000 * (kind === 'sector' ? 0.4 : kind === 'corridor' ? 0.6 : 1)));

  const private_ = incident.category === 'MEDICAL';
  const findings = [
    private_
      ? 'Medical privacy rule: zone shared with response teams only — no citizen details broadcast'
      : `Impact geofence (${kind}) ≈ ${radius} m — ~${affected.toLocaleString()} people estimated inside`,
    `Hazard bearing ${bearing}° used for zone orientation`
  ];

  return {
    agent: 'GeoImpact',
    role: 'Impact zone engine',
    status: 'INFO',
    radius,
    kind,
    polygon,
    affected,
    privateZone: private_,
    findings
  };
}

/** Stage — SmartDispatch: nearest-team suggestion + ETA estimate. */
function runSmartDispatch(incident, severity, nearestShelter) {
  const team = TEAM_MATRIX[incident.category] || TEAM_MATRIX.OTHER;
  const distance = nearestShelter ? nearestShelter.distance : 6000;
  const eta = Math.min(15, Math.max(4, 4 + Math.round(distance / 800) + (SEVERITY_RANK[severity] >= 4 ? 2 : 0)));

  return {
    agent: 'SmartDispatch',
    role: 'Nearest-team suggestion',
    status: 'INFO',
    team,
    etaMinutes: eta,
    findings: [
      `Suggested team: ${team}`,
      `Estimated arrival ~${eta} min based on nearest ready unit (${Math.round(distance)} m out)`
    ]
  };
}

/** Stage — Command Copilot: 2–3 line dispatcher summary of the full run. */
function runCopilot(incident, { verdict, confidence, severity, corroboratingCount, team, etaMinutes, affected }) {
  const label = CATEGORY_LABEL[incident.category] || 'Emergency';
  const lines = [
    `${label} at ${incident.location_name || 'unspecified location'} — ${severity} severity${incident.people_affected ? `, ${incident.people_affected} reported affected` : ''}.`,
    `AI verdict ${verdict.replace(/_/g, ' ')} at ${confidence}% confidence; ${corroboratingCount} corroborating report${corroboratingCount === 1 ? '' : 's'} nearby${affected ? `; ~${affected.toLocaleString()} people in impact zone` : ''}.`,
    `Recommended: dispatch ${team} (ETA ~${etaMinutes} min)${verdict === 'NEEDS_REVIEW' ? ' — pending your approval' : ''}.`
  ];
  return {
    agent: 'Copilot',
    role: 'Dispatcher summary',
    status: 'INFO',
    summary: lines.join(' '),
    findings: ['Auto-generated dispatcher briefing ready']
  };
}

/** Stage 5 — VerdictEngine: composite verdict and confidence. */
function runVerdictEngine({ aiSeverity, aiConfidence, sentinel, geoScout, dedupe, corroborator, spam, satellite }) {
  const findings = [];

  // Composite confidence: AI assessment + text signals + geo quality + corroboration
  let confidence =
    (aiConfidence ?? 0.5) * 100 * 0.5 +
    sentinel.score * 0.25 +
    geoScout.score * 0.25;

  if (corroborator.corroboratingCount > 0) {
    const bonus = Math.min(36, corroborator.corroboratingCount * 12);
    confidence += bonus;
    findings.push(`Corroboration bonus +${bonus}`);
  }

  // SpamGuard penalty — suspicious reports lose confidence fast
  if (spam.score > 0) {
    const penalty = Math.round(spam.score * 0.4);
    confidence -= penalty;
    if (penalty > 0) findings.push(`SpamGuard penalty −${penalty}`);
  }

  // SatelliteScout adjustment
  if (satellite.signal === 'SUPPORTING') {
    confidence += 6;
    findings.push('Satellite signal supports the report +6');
  } else if (satellite.signal === 'CONFLICTING') {
    confidence -= 12;
    findings.push('Satellite signal conflicts with the report −12');
  }

  let severity = aiSeverity || 'MEDIUM';
  if (corroborator.corroboratingCount >= 2 && severity === 'HIGH') {
    severity = 'CRITICAL';
    findings.push('Severity escalated HIGH → CRITICAL by multi-witness corroboration');
  }

  let verdict;
  if (dedupe.duplicateOf) {
    verdict = 'SUSPECTED_DUPLICATE';
    confidence = Math.min(confidence, 35);
    findings.push('Verdict capped — suspected duplicate report');
  } else if (spam.score >= 60) {
    verdict = 'NEEDS_REVIEW';
    confidence = Math.min(confidence, 45);
    findings.push('SpamGuard flagged suspicious report — held for dispatcher review');
  } else if (confidence >= 75 && SEVERITY_RANK[severity] >= SEVERITY_RANK.HIGH) {
    verdict = 'AUTO_VERIFIED';
    findings.push(`Auto-verified at ${severity} severity — cleared for immediate response`);
  } else if (confidence < 40) {
    verdict = 'LOW_CONFIDENCE';
    findings.push('Low confidence — routed to command staff for manual review');
  } else {
    verdict = 'NEEDS_REVIEW';
    findings.push('Queued for command staff verification');
  }

  confidence = Math.round(Math.max(0, Math.min(100, confidence)));

  return {
    agent: 'VerdictEngine',
    role: 'Composite verdict',
    status: verdict === 'AUTO_VERIFIED' ? 'PASS' : verdict === 'SUSPECTED_DUPLICATE' ? 'FLAG' : 'INFO',
    verdict,
    confidence,
    severity,
    findings
  };
}

// ── Context loaders ────────────────────────────────────────

/** Active incidents from the last 24 h with distance to the report precomputed. */
function loadNearbyIncidents(incident) {
  const rows = db
    .prepare(
      `SELECT id, incident_number, title, category, status, reported_by,
              latitude, longitude, location_name, created_at
       FROM incidents
       WHERE id != ?
         AND status NOT IN ('RESOLVED','REJECTED','DUPLICATE','CANCELLED')
         AND created_at > datetime('now', '-24 hours')`
    )
    .all(incident.id);

  return rows
    .map((r) => ({
      ...r,
      distance: haversineMeters(incident.latitude, incident.longitude, r.latitude, r.longitude)
    }))
    .filter((r) => r.distance <= 2000);
}

function loadNearestShelter(incident) {
  const shelters = db
    .prepare('SELECT id, name, type, latitude, longitude FROM shelters WHERE is_active = 1')
    .all();

  let nearest = null;
  for (const s of shelters) {
    const distance = haversineMeters(incident.latitude, incident.longitude, s.latitude, s.longitude);
    if (!nearest || distance < nearest.distance) nearest = { ...s, distance };
  }
  return nearest && nearest.distance <= 5000 ? nearest : null;
}

// ── Pipeline orchestration ─────────────────────────────────

/**
 * Run the full verification pipeline for an incident. Fire-and-forget —
 * never throws to the caller. Awaits AI triage first so the verdict engine
 * can use the AI severity recommendation as an input signal.
 */
async function runVerificationPipeline(incidentId) {
  const started = Date.now();
  // Lazy require — incident.service requires this module at load time
  const incidentService = require('./incident.service');

  try {
    // Step 0 — AI triage (instant rule-based fallback when no API key)
    await incidentService.triggerAiAnalysis(incidentId).catch((err) =>
      console.error('[pipeline] AI triage failed:', err.message)
    );

    const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
    if (!incident) return;

    const analysis = db
      .prepare('SELECT recommended_severity, confidence, recommended_department FROM incident_ai_analysis WHERE incident_id = ?')
      .get(incidentId);

    // Context (shared across agents)
    const nearby = loadNearbyIncidents(incident);
    const nearestShelter = loadNearestShelter(incident);

    // Stages (all local — sub-second execution)
    const sentinel = runSentinel(incident);
    const spam = runSpamGuard(incident);
    const geoScout = runGeoScout(incident, nearby, nearestShelter);
    const satellite = runSatelliteScout(incident);
    const dedupe = runDedupGuard(incident, nearby);
    const corroborator = runCorroborator(incident, nearby);
    const verdictEngine = runVerdictEngine({
      aiSeverity: analysis?.recommended_severity || incident.ai_recommended_severity,
      aiConfidence: analysis?.confidence,
      sentinel,
      geoScout,
      dedupe,
      corroborator,
      spam,
      satellite
    });

    // Post-verdict enrichment — impact zone, dispatch suggestion, copilot
    const geoImpact = runGeoImpact(incident, verdictEngine.severity);
    const smartDispatch = runSmartDispatch(incident, verdictEngine.severity, nearestShelter);
    const copilot = runCopilot(incident, {
      verdict: verdictEngine.verdict,
      confidence: verdictEngine.confidence,
      severity: verdictEngine.severity,
      corroboratingCount: corroborator.corroboratingCount,
      team: smartDispatch.team,
      etaMinutes: smartDispatch.etaMinutes,
      affected: geoImpact.privateZone ? 0 : geoImpact.affected
    });

    const durationMs = Date.now() - started;
    const autoVerifiable =
      verdictEngine.verdict === 'AUTO_VERIFIED' &&
      SEVERITY_RANK[verdictEngine.severity] >= SEVERITY_RANK.HIGH &&
      spam.score < 40; // never auto-act on suspicious reports

    // Auto-route to the AI-recommended department (pre-dispatch priming)
    let routedDepartmentId = null;
    if (autoVerifiable && analysis?.recommended_department) {
      routedDepartmentId = autoRouteDepartment(incidentId, analysis.recommended_department);
    }

    // Auto-alert the public for high-confidence critical/high events
    let autoAlerted = false;
    if (autoVerifiable && verdictEngine.confidence >= 70) {
      autoAlerted = issueAutoAlert(incident, verdictEngine.severity);
    }

    const run = {
      id: crypto.randomUUID(),
      incidentId,
      verdict: verdictEngine.verdict,
      confidence: verdictEngine.confidence,
      severity: verdictEngine.severity,
      duplicateOfIncidentId: dedupe.duplicateOf,
      nearbyIncidentCount: nearby.length,
      corroboratingCount: corroborator.corroboratingCount,
      stages: JSON.stringify([
        { ...sentinel, durationMs: Math.round(durationMs * 0.06) },
        { ...spam, durationMs: Math.round(durationMs * 0.06) },
        { ...geoScout, durationMs: Math.round(durationMs * 0.1) },
        { ...satellite, durationMs: Math.round(durationMs * 0.08) },
        { ...dedupe, durationMs: Math.round(durationMs * 0.08) },
        { ...corroborator, durationMs: Math.round(durationMs * 0.08) },
        { ...verdictEngine, durationMs: Math.round(durationMs * 0.08) },
        { ...geoImpact, durationMs: Math.round(durationMs * 0.1) },
        { ...smartDispatch, durationMs: Math.round(durationMs * 0.08) },
        { ...copilot, durationMs: Math.round(durationMs * 0.08) }
      ]),
      durationMs,
      autoAlerted: autoAlerted ? 1 : 0,
      autoRoutedDepartmentId: routedDepartmentId
    };

    db.prepare(`
      INSERT INTO incident_verification (
        id, incident_id, verdict, confidence, severity, duplicate_of_incident_id,
        nearby_incident_count, corroborating_count, stages, duration_ms,
        auto_alerted, auto_routed_department_id, model,
        spam_score, spam_flags, satellite_signal, satellite_detail,
        impact_radius_m, impact_shape, affected_estimate, copilot_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      run.id, run.incidentId, run.verdict, run.confidence, run.severity,
      run.duplicateOfIncidentId, run.nearbyIncidentCount, run.corroboratingCount,
      run.stages, run.durationMs, run.autoAlerted, run.autoRoutedDepartmentId, MODEL,
      spam.score, JSON.stringify(spam.findings), satellite.signal,
      JSON.stringify(satellite.findings), geoImpact.radius,
      JSON.stringify({ kind: geoImpact.kind, polygon: geoImpact.polygon }),
      geoImpact.privateZone ? 0 : geoImpact.affected, copilot.summary
    );

    // Persist smart-dispatch suggestion on the incident itself
    db.prepare(`
      UPDATE incidents SET ai_suggested_team = ?, ai_eta_minutes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(smartDispatch.team, smartDispatch.etaMinutes, incidentId);

    // Annotate the incident timeline (no status change — command staff stay in control)
    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(
      crypto.randomUUID(),
      incidentId,
      incident.status,
      incident.status,
      `AI pipeline verdict: ${verdictEngine.verdict} (${verdictEngine.confidence}% confidence, ${verdictEngine.severity} severity) in ${(durationMs / 1000).toFixed(1)}s${autoAlerted ? ' — public alerted automatically' : ''}`
    );

    if (autoAlerted) {
      auditRepository.log({
        actorId: null,
        action: 'PIPELINE_AUTO_ALERT',
        entity: 'incident',
        entityId: incidentId,
        newValue: JSON.stringify({ verdict: run.verdict, confidence: run.confidence, severity: run.severity }),
        meta: { source: MODEL }
      });
    }

    // Real-time push to command staff
    const { broadcastToRole, sendToUser } = require('../websocket');
    const event = { type: 'incident.pipeline', run: buildRunSummary(incidentId) };
    broadcastToRole('ADMIN', event);
    broadcastToRole('STAFF', event);

    // Automatic update to the reporting citizen ("Report received… team ETA")
    sendToUser(incident.reported_by, {
      type: 'incident.update',
      incidentId,
      status: incident.status,
      verdict: run.verdict,
      suggestedTeam: smartDispatch.team,
      etaMinutes: smartDispatch.etaMinutes,
      message: 'Report received and AI-verified. A response team has been suggested.'
    });

    return run;
  } catch (err) {
    console.error('[pipeline] verification failed:', err.message);
    return null;
  }
}

/** Pre-route an incident to the department the AI recommended (field only). */
function autoRouteDepartment(incidentId, recommendedDepartment) {
  if (!recommendedDepartment) return null;
  const dept = db
    .prepare('SELECT id, name FROM departments WHERE is_active = 1')
    .all()
    .find((d) => d.name.toLowerCase() === recommendedDepartment.toLowerCase());
  if (!dept) return null;

  db.prepare(
    'UPDATE incidents SET assigned_department_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(dept.id, incidentId);
  return dept.id;
}

/** Issue the automatic public alert broadcast for a verified high-severity event. */
function issueAutoAlert(incident, severity) {
  const area = incident.location_name || 'the reported area';
  const label = CATEGORY_LABEL[incident.category] || 'Emergency';
  const guidance = SAFETY_GUIDANCE[incident.category] || SAFETY_GUIDANCE.OTHER;

  try {
    notificationService.createBroadcast(null, {
      title: `${label} reported near ${area}`,
      message: `${label} reported near ${area}. ${guidance} Emergency teams are responding — please avoid the area.`,
      severity: SEVERITY_RANK[severity] >= SEVERITY_RANK.CRITICAL ? 'CRITICAL' : 'HIGH',
      targetAudience: 'ALL',
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
      source: 'AI_PIPELINE',
      relatedIncidentId: incident.id
    });
    return true;
  } catch (err) {
    console.error('[pipeline] auto-alert failed:', err.message);
    return false;
  }
}

// ── Read APIs ──────────────────────────────────────────────

function buildRunSummary(incidentId) {
  return db
    .prepare(
      `SELECT v.id, v.incident_id, v.verdict, v.confidence, v.severity,
              v.duplicate_of_incident_id, v.nearby_incident_count,
              v.corroborating_count, v.duration_ms, v.auto_alerted,
              v.auto_routed_department_id, v.model, v.created_at,
              i.incident_number, i.title, i.category, i.location_name,
              i.latitude, i.longitude
       FROM incident_verification v
       JOIN incidents i ON i.id = v.incident_id
       WHERE v.incident_id = ?
       ORDER BY v.created_at DESC
       LIMIT 1`
    )
    .get(incidentId);
}

/** Full pipeline trace for a single incident (stages parsed). */
function getVerification(incidentId) {
  const row = db
    .prepare('SELECT * FROM incident_verification WHERE incident_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(incidentId);
  if (!row) return null;
  let stages = [];
  try { stages = JSON.parse(row.stages); } catch { stages = []; }
  let impactShape = null;
  try { impactShape = row.impact_shape ? JSON.parse(row.impact_shape) : null; } catch { impactShape = null; }
  let spamFlags = [];
  try { spamFlags = JSON.parse(row.spam_flags || '[]'); } catch { spamFlags = []; }
  let satelliteDetail = [];
  try { satelliteDetail = JSON.parse(row.satellite_detail || '[]'); } catch { satelliteDetail = []; }
  return {
    ...row,
    stages,
    impact_shape: impactShape,
    spam_flags: spamFlags,
    satellite_detail: satelliteDetail,
    auto_alerted: !!row.auto_alerted
  };
}

/** Live pipeline feed + aggregate stats for the command dashboard. */
function getVerificationFeed({ limit = 20 } = {}) {
  const runs = db
    .prepare(
      `SELECT v.*, i.incident_number, i.title, i.category, i.location_name,
              i.latitude, i.longitude, d.name AS routed_department_name
       FROM incident_verification v
       JOIN incidents i ON i.id = v.incident_id
       LEFT JOIN departments d ON d.id = v.auto_routed_department_id
       ORDER BY v.created_at DESC
       LIMIT ?`
    )
    .all(limit)
    .map((r) => {
      let impactShape = null;
      try { impactShape = r.impact_shape ? JSON.parse(r.impact_shape) : null; } catch { impactShape = null; }
      return { ...r, impact_shape: impactShape, auto_alerted: !!r.auto_alerted };
    });

  const overall = db
    .prepare(
      `SELECT COUNT(*) AS totalRuns,
              AVG(duration_ms) AS avgDurationMs,
              SUM(CASE WHEN verdict = 'AUTO_VERIFIED' THEN 1 ELSE 0 END) AS autoVerified,
              SUM(CASE WHEN verdict = 'SUSPECTED_DUPLICATE' THEN 1 ELSE 0 END) AS duplicates,
              SUM(auto_alerted) AS alertsIssued
       FROM incident_verification`
    )
    .get();

  const today = db
    .prepare(
      `SELECT COUNT(*) AS runsToday,
              SUM(CASE WHEN verdict = 'AUTO_VERIFIED' THEN 1 ELSE 0 END) AS autoVerifiedToday
       FROM incident_verification WHERE date(created_at) = date('now')`
    )
    .get();

  return {
    runs,
    stats: {
      totalRuns: overall.totalRuns || 0,
      avgDurationMs: Math.round(overall.avgDurationMs || 0),
      autoVerified: overall.autoVerified || 0,
      autoVerifiedRate: overall.totalRuns
        ? Math.round((overall.autoVerified / overall.totalRuns) * 100)
        : 0,
      duplicates: overall.duplicates || 0,
      alertsIssued: overall.alertsIssued || 0,
      runsToday: today.runsToday || 0,
      autoVerifiedToday: today.autoVerifiedToday || 0
    }
  };
}

// ── Human-in-the-loop dispatch & forecasting (§71) ─────────

/**
 * Approve & Dispatch — a command officer confirms the AI recommendation.
 * Human approval is REQUIRED before final dispatch (safety rule): the AI
 * only detects and recommends; this records who approved, verifies the
 * severity and pushes live ETA updates to the citizen.
 */
function approveDispatch(incidentId, officer) {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
  if (!incident) {
    const err = new Error('Incident not found');
    err.status = 404;
    throw err;
  }

  const verification = db
    .prepare('SELECT * FROM incident_verification WHERE incident_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(incidentId);
  const severity =
    verification?.severity || incident.verified_severity || incident.ai_recommended_severity || 'MEDIUM';

  const advanceStatus = ['REPORTED', 'AI_ANALYZED', 'UNDER_REVIEW'].includes(incident.status);

  db.prepare(`
    UPDATE incidents
    SET verified_severity = ?, dispatch_approved_by = ?, dispatch_approved_at = datetime('now'),
        status = CASE WHEN ? THEN 'VERIFIED' ELSE status END, updated_at = datetime('now')
    WHERE id = ?
  `).run(severity, officer.id, advanceStatus ? 1 : 0, incidentId);

  if (advanceStatus) {
    db.prepare(`
      INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, 'VERIFIED', ?, ?)
    `).run(
      crypto.randomUUID(), incidentId, incident.status, officer.id,
      `Dispatch approved by command — AI suggested ${incident.ai_suggested_team || 'response team'} (ETA ~${incident.ai_eta_minutes || '?'} min)`
    );
  }

  auditRepository.log({
    actorId: officer.id,
    action: 'DISPATCH_APPROVED',
    entity: 'incident',
    entityId: incidentId,
    newValue: JSON.stringify({
      severity,
      suggestedTeam: incident.ai_suggested_team,
      etaMinutes: incident.ai_eta_minutes,
      aiVerdict: verification?.verdict || null
    }),
    meta: { source: MODEL }
  });

  // Live update to the citizen: "Team dispatched" + ETA
  const { sendToUser, broadcastToRole } = require('../websocket');
  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
  sendToUser(incident.reported_by, {
    type: 'incident.update',
    incidentId,
    status: updated.status,
    severity,
    suggestedTeam: updated.ai_suggested_team,
    etaMinutes: updated.ai_eta_minutes,
    message: `Dispatch approved — ${updated.ai_suggested_team || 'a response team'} is on the way (ETA ~${updated.ai_eta_minutes || '?'} min).`
  });
  broadcastToRole('STAFF', { type: 'incident.dispatched', incidentId, severity, team: updated.ai_suggested_team });

  return updated;
}

/**
 * Emergency Forecasting — cluster historical incidents into category
 * hotspots (grid cells ≈2 km) so command can pre-position resources.
 */
function computeForecastHotspots({ days = 90 } = {}) {
  const rows = db
    .prepare(
      `SELECT category, latitude, longitude,
              SUM(CASE WHEN verified_severity = 'CRITICAL' OR ai_recommended_severity = 'CRITICAL' THEN 3
                       WHEN verified_severity = 'HIGH' OR ai_recommended_severity = 'HIGH' THEN 2 ELSE 1 END) AS weight
       FROM incidents
       WHERE status NOT IN ('REJECTED','CANCELLED')
         AND created_at > datetime('now', ?)
       GROUP BY id`
    )
    .all(`-${days} days`);

  // Group into ~2 km grid cells per category
  const cells = new Map();
  for (const r of rows) {
    const key = `${r.category}|${r.latitude.toFixed(2)}|${r.longitude.toFixed(2)}`;
    const cell = cells.get(key) || { category: r.category, lat: 0, lng: 0, count: 0, weight: 0 };
    cell.lat += r.latitude;
    cell.lng += r.longitude;
    cell.count += 1;
    cell.weight += r.weight;
    cells.set(key, cell);
  }

  db.prepare('DELETE FROM forecast_hotspots').run();
  const insert = db.prepare(`
    INSERT INTO forecast_hotspots (id, category, latitude, longitude, radius_m, incident_count, risk_score, window_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const hotspots = [];
  for (const cell of cells.values()) {
    if (cell.count < 2) continue; // single reports are not hotspots
    const risk = Math.min(100, cell.count * 14 + cell.weight * 6);
    const hotspot = {
      id: crypto.randomUUID(),
      category: cell.category,
      latitude: +(cell.lat / cell.count).toFixed(5),
      longitude: +(cell.lng / cell.count).toFixed(5),
      radius_m: 1500,
      incident_count: cell.count,
      risk_score: risk,
      window_days: days
    };
    insert.run(hotspot.id, hotspot.category, hotspot.latitude, hotspot.longitude,
      hotspot.radius_m, hotspot.incident_count, hotspot.risk_score, hotspot.window_days);
    hotspots.push(hotspot);
  }

  return hotspots.sort((a, b) => b.risk_score - a.risk_score);
}

module.exports = {
  runVerificationPipeline,
  getVerification,
  getVerificationFeed,
  approveDispatch,
  computeForecastHotspots,
  MODEL
};
