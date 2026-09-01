/**
 * Qwen AI service — calls Alibaba Cloud Model Studio (DashScope) for
 * incident text analysis. Returns structured JSON per §19.
 *
 * If the API key is missing or the call fails, returns a graceful
 * fallback so incident creation is never blocked (§69).
 */
const env = require('../config/env');

const SYSTEM_PROMPT = `You are CIRO, an AI incident analysis system for emergency response.
Analyse the citizen emergency report below and return ONLY a JSON object (no markdown, no explanation) with these exact fields:

{
  "summary": "One-sentence description of the emergency",
  "recommendedSeverity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "confidence": 0.0 to 1.0,
  "recommendedDepartment": "Name of the best responding department",
  "secondaryDepartment": "Secondary department if needed, or null",
  "riskTags": ["tag1", "tag2"],
  "recommendedActions": ["Action 1", "Action 2"],
  "reasoningSummary": "Why this severity and department were recommended"
}

Severity rules:
- CRITICAL: Life-threatening, mass casualty, infrastructure collapse
- HIGH: Injuries, significant property damage, spreading danger
- MEDIUM: Contained incident, minor injuries, limited impact
- LOW: Minor nuisance, no injuries, easily resolved

Department mapping:
- Rescue 1122: general rescue, flood, building collapse, accident
- Fire Department: fire, gas leak, explosion
- Traffic Police: road accidents, traffic obstruction
- Police: security, crime, law enforcement
- WAPDA: power outage, electrical hazard
- Medical Team: medical emergency, injuries, illness

Always respond in valid JSON. Never include markdown fencing.`;

/**
 * Analyse an incident using Qwen text model.
 * @param {object} incident - The incident record
 * @returns {Promise<object>} Structured analysis result
 */
async function analyseIncident(incident) {
  const { apiKey, baseUrl, textModel } = env.dashscope;

  if (!apiKey) {
    return buildFallback(incident, 'No API key configured');
  }

  const userMessage = buildUserMessage(incident);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: textModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 600
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error(`[qwen] API error ${response.status}: ${errText}`);
      return buildFallback(incident, `API returned ${response.status}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      return buildFallback(incident, 'Empty response from AI');
    }

    return parseAIResponse(content, textModel);
  } catch (err) {
    console.error(`[qwen] Analysis failed: ${err.message}`);
    return buildFallback(incident, err.message);
  }
}

function buildUserMessage(incident) {
  const parts = [
    `Category: ${incident.category}`,
    `Title: ${incident.title}`,
    `Description: ${incident.description}`,
    `Location: ${incident.location_name || `${incident.latitude}, ${incident.longitude}`}`,
    `People affected: ${incident.people_affected || 'Unknown'}`
  ];
  if (incident.extra_details) {
    parts.push(`Additional details: ${incident.extra_details}`);
  }
  return parts.join('\n');
}

function parseAIResponse(content, modelName) {
  // Strip markdown fencing if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Validate and normalise
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const severity = validSeverities.includes(parsed.recommendedSeverity)
      ? parsed.recommendedSeverity
      : 'MEDIUM';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    return {
      status: 'COMPLETED',
      modelName,
      aiSummary: parsed.summary || 'AI analysis completed',
      recommendedSeverity: severity,
      confidence,
      recommendedDepartment: parsed.recommendedDepartment || null,
      secondaryDepartment: parsed.secondaryDepartment || null,
      riskTags: JSON.stringify(Array.isArray(parsed.riskTags) ? parsed.riskTags : []),
      recommendedActions: JSON.stringify(Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : []),
      reasoningSummary: parsed.reasoningSummary || null,
      errorMessage: null
    };
  } catch (parseErr) {
    console.error('[qwen] Failed to parse AI response:', parseErr.message);
    return {
      status: 'FAILED',
      modelName,
      aiSummary: null,
      recommendedSeverity: null,
      confidence: null,
      recommendedDepartment: null,
      secondaryDepartment: null,
      riskTags: null,
      recommendedActions: null,
      reasoningSummary: null,
      errorMessage: `Failed to parse AI response: ${parseErr.message}`
    };
  }
}

/**
 * Rule-based fallback when Qwen is unavailable. Uses category mapping
 * so the admin still gets a reasonable recommendation (§69).
 */
function buildFallback(incident, reason) {
  const DEPT_MAP = {
    FLOOD: 'Rescue 1122',
    FIRE: 'Fire Department',
    ACCIDENT: 'Rescue 1122',
    MEDICAL: 'Medical Team',
    POWER_OUTAGE: 'WAPDA',
    BUILDING_COLLAPSE: 'Rescue 1122',
    GAS_LEAK: 'Fire Department',
    SECURITY: 'Police',
    EXTREME_WEATHER: 'Rescue 1122',
    OTHER: 'Rescue 1122'
  };

  const SEVERITY_MAP = {
    FLOOD: 'HIGH',
    FIRE: 'HIGH',
    ACCIDENT: 'HIGH',
    MEDICAL: 'HIGH',
    POWER_OUTAGE: 'MEDIUM',
    BUILDING_COLLAPSE: 'CRITICAL',
    GAS_LEAK: 'HIGH',
    SECURITY: 'HIGH',
    EXTREME_WEATHER: 'MEDIUM',
    OTHER: 'MEDIUM'
  };

  const severity = SEVERITY_MAP[incident.category] || 'MEDIUM';
  const dept = DEPT_MAP[incident.category] || 'Rescue 1122';

  return {
    status: 'COMPLETED',
    modelName: 'rule-based-fallback',
    aiSummary: `${incident.category.replace('_', ' ').toLowerCase()} reported at ${incident.location_name || 'unknown location'}. ${incident.people_affected || 0} people potentially affected.`,
    recommendedSeverity: severity,
    confidence: 0.5,
    recommendedDepartment: dept,
    secondaryDepartment: null,
    riskTags: JSON.stringify([incident.category.toLowerCase(), 'auto_classified']),
    recommendedActions: JSON.stringify([`Dispatch ${dept} to assess the situation`]),
    reasoningSummary: `AI unavailable (${reason}). Severity and department estimated from category rules.`,
    errorMessage: null
  };
}

module.exports = { analyseIncident };
