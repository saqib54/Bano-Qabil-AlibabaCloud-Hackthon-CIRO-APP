/**
 * AI Emergency Auto-Triage — Smart Report Extraction (§71).
 *
 * Extracts emergency structure from free text in English, Urdu or Roman
 * Urdu: category, location, people affected, priority, required team and
 * an instant authority-approved safety response. Rule-based so it works
 * offline in milliseconds (mirrors the qwen.service fallback approach).
 *
 * Example:
 *   "Lahore Ring Road par accident hua hai, do log injured hain."
 *   → ACCIDENT · Lahore Ring Road · 2 people · HIGH · Ambulance + Traffic Police
 */

/** Category detection vocabulary — English, Roman Urdu and Urdu script. */
const CATEGORY_VOCAB = {
  FIRE: ['fire', 'aag', 'آگ', 'jal rahi', 'burning', 'smoke', 'dhuan', 'دھواں', 'blaze'],
  FLOOD: ['flood', 'selab', 'سیلاب', 'pani bhar', 'pani charh', 'water rising', 'doob', 'flooded', 'بارش کا پانی'],
  ACCIDENT: ['accident', 'hadsa', 'حادثہ', 'crash', 'takkar', 'collision', 'gari takra', 'vehicle hit', 'road accident'],
  MEDICAL: ['medical', 'heart attack', 'stroke', 'behosh', 'unconscious', 'not breathing', 'zakhmi', 'زخمی', 'bimar', 'بیمار', 'ambulance chahiye', 'collapse ho gaya'],
  SECURITY: ['robbery', 'daketi', 'ڈکیتی', 'chor', 'thief', 'snatch', 'gun', 'firing', 'crime', 'terror', 'dhamki'],
  GAS_LEAK: ['gas leak', 'gas bhar', 'cylinder', 'گیس', 'smell of gas', 'sui gas'],
  BUILDING_COLLAPSE: ['building collapse', 'imarat gir', 'عمارت', 'roof fell', 'chhat gir', 'wall collapse', 'deewar gir'],
  POWER_OUTAGE: ['bijli', 'بجلی', 'electricity', 'power outage', 'blackout', 'transformer blast', 'wire down'],
  EXTREME_WEATHER: ['toofan', 'طوفان', 'storm', 'heavy rain', 'barish', 'بارش', 'hail', 'heatwave', 'garmi ki lehar']
};

/** Known Pakistani cities / landmarks for auto location detection. */
const KNOWN_PLACES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
  'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur',
  'Ring Road', 'Motorway', 'GT Road', 'Mall Road', 'Saddar', 'Gulberg',
  'DHA', 'Clifton', 'Johar Town', 'Model Town', 'Blue Area', 'F-7', 'G-11'
];

/** Roman Urdu / Urdu numerals for people-affected extraction. */
const WORD_NUMBERS = {
  ek: 1, aik: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5,
  che: 6, saat: 7, aath: 8, nau: 9, das: 10, kai: 8, kayi: 8, bohat: 15, bahut: 15
};

/** Authority-approved instant safety responses (never free-form AI text). */
const INSTANT_RESPONSE = {
  FIRE: 'Aapki report receive ho gayi hai. Aag aur dhuan se door rahen, neeche jhuk kar saans len aur area khali karein. Team dispatch ho rahi hai.',
  FLOOD: 'Report receive ho gayi hai. Foran unchi jagah par jayen aur pani mein paidal ya gadi se guzarne se parhez karein.',
  ACCIDENT: 'Aapki report receive ho gayi hai. Safe distance par rahen, zakhmi logon ko na hilayen aur emergency vehicles ke liye rasta clear rakhen.',
  MEDICAL: 'Report receive ho gayi hai. Mareez ko pur-sukoon rakhen, saans ki nali khuli rakhen aur ambulance ka intezar karein.',
  SECURITY: 'Report receive ho gayi hai. Mehfooz jagah par rahen aur police ki hidayat par amal karein.',
  GAS_LEAK: 'Report receive ho gayi hai. Koi shola ya switch on na karein, khirkiyan kholen aur foran area khali karein.',
  BUILDING_COLLAPSE: 'Report receive ho gayi hai. Imarat ke qareeb se hat jayen — mazeed girne ka khatra hai.',
  POWER_OUTAGE: 'Report receive ho gayi hai. Kati hui taron se door rahen aur kisi bhi giray hue cable ko haath na lagayen.',
  EXTREME_WEATHER: 'Report receive ho gayi hai. Mazboot chhat ke neeche rahen aur khule maidan se bachen.',
  OTHER: 'Aapki report receive ho gayi hai. Area se door rahen — team ko alert kar diya gaya hai.'
};

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

const URGENCY_WORDS = [
  'urgent', 'foran', 'فوری', 'critical', 'khatarnak', 'dangerous', 'trapped',
  'phansa', 'unconscious', 'behosh', 'dying', 'mar gaya', 'bleeding', 'khoon'
];

/**
 * Extract structured emergency data from free text.
 * @param {string} text — user text/voice transcript (EN / Roman Urdu / Urdu)
 * @returns extraction object for the report form autofill
 */
function extractReport(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();

  // 1. Category — best vocabulary match count
  let category = null;
  let best = 0;
  for (const [cat, words] of Object.entries(CATEGORY_VOCAB)) {
    const hits = words.filter((w) => lower.includes(w.toLowerCase())).length;
    if (hits > best) { best = hits; category = cat; }
  }
  if (!category && /injur|zakhmi|chot/.test(lower)) category = 'MEDICAL';
  if (!category) category = 'OTHER';

  // 2. Location — known place names found in the text
  const foundPlaces = KNOWN_PLACES.filter((p) =>
    lower.includes(p.toLowerCase()) || raw.includes(p)
  );
  const locationName = foundPlaces.length > 0 ? foundPlaces.join(', ') : null;

  // 3. People affected — digits + Roman Urdu/Urdu number words near "log/log/people"
  let peopleAffected = null;
  const digitMatch = lower.match(/(\d{1,3})\s*(log|banday|bande|banda|people|persons?|injured|zakhmi|afraad)/);
  if (digitMatch) {
    peopleAffected = parseInt(digitMatch[1], 10);
  } else {
    for (const [word, value] of Object.entries(WORD_NUMBERS)) {
      const re = new RegExp(`\\b${word}\\s+(log|banday|bande|banda|afraad|injured|zakhmi)`);
      if (re.test(lower)) { peopleAffected = value; break; }
    }
  }

  // 4. Priority hint — urgency vocabulary
  const urgentHits = URGENCY_WORDS.filter((w) => lower.includes(w.toLowerCase())).length;
  const priority = urgentHits >= 2 || (peopleAffected || 0) >= 5 ? 'CRITICAL'
    : urgentHits === 1 || (peopleAffected || 0) >= 2 ? 'HIGH'
    : 'MEDIUM';

  return {
    category,
    categoryConfidence: category === 'OTHER' ? 40 : Math.min(96, 55 + best * 18),
    locationName,
    peopleAffected,
    priority,
    suggestedTeam: TEAM_MATRIX[category],
    safetyResponse: INSTANT_RESPONSE[category],
    detectedSignals: {
      urgencyWords: urgentHits,
      placesFound: foundPlaces,
      matchedCategoryTerms: CATEGORY_VOCAB[category]?.filter((w) => lower.includes(w.toLowerCase())) || []
    }
  };
}

module.exports = { extractReport, INSTANT_RESPONSE, TEAM_MATRIX };
