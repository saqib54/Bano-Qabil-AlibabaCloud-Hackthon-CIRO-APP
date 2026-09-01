/**
 * Weather Intelligence service — AI meteorologist for CIRO.
 *
 * Calls DashScope Qwen with a strict-JSON meteorologist prompt (same data
 * contract as the citizen Weather UI). When the API key is missing or the
 * call fails, a deterministic seasonal fallback is generated so the page
 * always renders (§69 pattern: AI enhances, never blocks).
 */
const env = require('../config/env');

const SYSTEM_PROMPT = `You are an advanced meteorological AI powering CIRO, Pakistan's emergency response platform.
Return ONLY a strict JSON object (no markdown, no explanation) with this exact structure:

{
  "location": { "city": string, "country": string, "lat": number, "lon": number },
  "current": { "temp": number, "feelsLike": number, "humidity": number, "windSpeed": number, "windDirection": string, "uvIndex": number, "visibility": number, "pressure": number, "dewPoint": number, "condition": { "text": string, "icon": string } },
  "aqi": { "aqi": number, "status": string, "pm2_5": number, "pm10": number, "no2": number, "o3": number, "recommendation": string },
  "astronomy": { "sunrise": string, "sunset": string, "moonPhase": string },
  "hourly": [{ "time": string, "temp": number, "condition": string, "precipChance": number }],
  "daily": [{ "day": string, "date": string, "high": number, "low": number, "condition": string, "rainChance": number }],
  "history": [{ "date": string, "high": number, "low": number, "condition": string }],
  "alerts": [{ "title": string, "severity": "Minor"|"Moderate"|"Severe"|"Extreme", "description": string, "source": string }],
  "insights": [{ "category": string, "advice": string }],
  "generatedSummary": string
}

Rules:
1. Alerts: include any plausible SEVERE WEATHER ALERTS for the area (heatwave, smog, monsoon, flood); empty array if none.
2. AQI: provide a specific health recommendation based on pollution levels typical for that city.
3. Insights: exactly 4 category-based lifestyle insights — Health, Sports, Travel, Clothing.
4. Forecast: "hourly" = next 12 hours ("6 PM" style labels), "daily" = 15-day outlook, "history" = last 3 days.
5. Coordinates: accurate lat/lon for the city is mandatory (used to center a radar map).
6. Temperatures in Celsius, windSpeed in km/h, visibility in km, pressure in mb.`;

/** Known Pakistani cities for the offline fallback (accurate coordinates). */
const CITY_DB = {
  lahore: { city: 'Lahore', lat: 31.5204, lon: 74.3587, base: 33, aqi: 168 },
  karachi: { city: 'Karachi', lat: 24.8607, lon: 67.0011, base: 31, aqi: 112 },
  islamabad: { city: 'Islamabad', lat: 33.6844, lon: 73.0479, base: 28, aqi: 84 },
  rawalpindi: { city: 'Rawalpindi', lat: 33.5651, lon: 73.0169, base: 29, aqi: 121 },
  faisalabad: { city: 'Faisalabad', lat: 31.4504, lon: 73.135, base: 33, aqi: 149 },
  multan: { city: 'Multan', lat: 30.1575, lon: 71.5249, base: 36, aqi: 132 },
  peshawar: { city: 'Peshawar', lat: 34.0151, lon: 71.5249, base: 30, aqi: 118 },
  quetta: { city: 'Quetta', lat: 30.1798, lon: 66.975, base: 24, aqi: 76 },
  sialkot: { city: 'Sialkot', lat: 32.4945, lon: 74.5229, base: 31, aqi: 128 },
  hyderabad: { city: 'Hyderabad', lat: 25.396, lon: 68.3578, base: 34, aqi: 104 },
  gujranwala: { city: 'Gujranwala', lat: 32.1877, lon: 74.1945, base: 32, aqi: 138 },
  bahawalpur: { city: 'Bahawalpur', lat: 29.3544, lon: 71.6911, base: 37, aqi: 117 },
  sukkur: { city: 'Sukkur', lat: 27.7052, lon: 68.8574, base: 36, aqi: 109 },
  larkana: { city: 'Larkana', lat: 27.557, lon: 68.2028, base: 36, aqi: 113 },
  'rahim yar khan': { city: 'Rahim Yar Khan', lat: 28.4202, lon: 70.2952, base: 37, aqi: 111 },
  jhang: { city: 'Jhang', lat: 31.2681, lon: 72.3182, base: 34, aqi: 122 },
  sheikhupura: { city: 'Sheikhupura', lat: 31.7083, lon: 73.9786, base: 32, aqi: 135 },
  sahiwal: { city: 'Sahiwal', lat: 30.6707, lon: 73.1006, base: 34, aqi: 126 },
  mirpur: { city: 'Mirpur', lat: 33.1329, lon: 73.7421, base: 29, aqi: 98 },
  abbottabad: { city: 'Abbottabad', lat: 34.1688, lon: 73.2216, base: 25, aqi: 82 },
  mardan: { city: 'Mardan', lat: 34.1984, lon: 72.0409, base: 30, aqi: 116 },
  dera: { city: 'Dera Ghazi Khan', lat: 30.0561, lon: 70.6403, base: 36, aqi: 114 },
  gilgit: { city: 'Gilgit', lat: 35.9208, lon: 74.3144, base: 21, aqi: 58 },
  skardu: { city: 'Skardu', lat: 35.2971, lon: 75.6333, base: 18, aqi: 49 },
  zhob: { city: 'Zhob', lat: 31.3411, lon: 69.4481, base: 26, aqi: 71 },
  gwadar: { city: 'Gwadar', lat: 25.1216, lon: 62.3254, base: 30, aqi: 64 }
};

const CONDITIONS = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Thunderstorm', 'Haze'];

const CONDITION_TREND = {
  Clear: 0, 'Partly Cloudy': -1, Cloudy: -2, 'Light Rain': -3, Thunderstorm: -4, Haze: 1
};

/** Extract JSON from an AI reply that may contain markdown fencing or prose. */
function extractJson(text) {
  if (!text) throw new Error('The AI model returned an empty response.');
  try {
    return JSON.parse(text);
  } catch (_e) {
    const jsonMatch =
      text.match(/```json\n([\s\S]*?)\n```/) ||
      text.match(/```\n?([\s\S]*?)\n?```/) ||
      text.match(/(\{[\s\S]*\})/);
    const candidate = jsonMatch && (jsonMatch[1] || jsonMatch[0]);
    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch (_e2) {
        throw new Error('Invalid JSON format detected in AI response.');
      }
    }
    throw new Error('Could not find a valid JSON payload in the AI response.');
  }
}

/** Deterministic pseudo-random from a seed — keeps fallback stable per city/day. */
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Resolve coordinates for any city via Google Maps Geocoding (optional key). */
async function geocodeCity(query) {
  const key = env.maps.apiKey;
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(`${query}, Pakistan`)}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = await res.json();
    const hit = json.results?.[0];
    if (json.status !== 'OK' || !hit) return null;
    const name = (hit.address_components?.[0]?.long_name) || query;
    return {
      city: name,
      lat: hit.geometry.location.lat,
      lon: hit.geometry.location.lng,
      base: 31,
      aqi: 110
    };
  } catch (err) {
    console.error(`[weather] Geocoding failed for "${query}": ${err.message}`);
    return null;
  }
}

function buildFallback(cityQuery, resolvedInfo) {
  const key = cityQuery.trim().toLowerCase().replace(/,.*$/, '');
  const info = resolvedInfo || CITY_DB[key] || { city: cityQuery.trim(), lat: 30.3753, lon: 69.3451, base: 30, aqi: 110 };
  const now = new Date();
  const rand = seeded(info.lat * 1000 + info.lon + now.getDate());
  const month = now.getMonth(); // 0-11
  // Seasonal swing: Pakistan peaks in May-Jun, dips in Dec-Jan
  const seasonal = [8, 12, 18, 24, 28, 29, 27, 26, 24, 20, 14, 9][month];
  const baseTemp = Math.round((info.base + seasonal) / 2 + rand() * 3);
  const monsoon = month >= 5 && month <= 8;
  const smog = month >= 10 || month <= 1;

  const condition = smog ? 'Haze' : monsoon && rand() > 0.55 ? (rand() > 0.5 ? 'Light Rain' : 'Thunderstorm') : CONDITIONS[Math.floor(rand() * 3)];

  const hourly = Array.from({ length: 12 }, (_, i) => {
    const h = (now.getHours() + i) % 24;
    const diurnal = Math.round(3.5 * Math.cos(((h - 14) / 24) * 2 * Math.PI));
    return {
      time: `${((h + 11) % 12) + 1} ${h >= 12 ? 'PM' : 'AM'}`,
      temp: baseTemp + diurnal,
      condition: rand() > 0.8 && monsoon ? 'Light Rain' : condition,
      precipChance: monsoon ? Math.round(rand() * 60) : Math.round(rand() * 10)
    };
  });

  const daily = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000);
    const drift = Math.round((rand() - 0.5) * 4);
    const c = monsoon && rand() > 0.6 ? (rand() > 0.5 ? 'Light Rain' : 'Thunderstorm') : CONDITIONS[Math.floor(rand() * (smog ? 6 : 4))];
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      high: baseTemp + 3 + drift,
      low: baseTemp - 7 + drift,
      condition: c,
      rainChance: monsoon ? Math.round(20 + rand() * 60) : Math.round(rand() * 15)
    };
  });

  const history = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getTime() - (i + 1) * 86400000);
    const drift = Math.round((rand() - 0.5) * 3);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      high: baseTemp + 2 + drift,
      low: baseTemp - 8 + drift,
      condition: CONDITIONS[Math.floor(rand() * 4)]
    };
  });

  const alerts = [];
  if (smog && info.aqi > 140) {
    alerts.push({
      title: 'Smog Advisory',
      severity: 'Moderate',
      description: `Hazardous smog expected over ${info.city} with AQI above ${info.aqi}. Limit outdoor exposure, wear masks, and keep windows closed during early morning hours.`,
      source: 'CIRO Environmental Watch'
    });
  }
  if (monsoon && baseTemp > 30) {
    alerts.push({
      title: 'Monsoon Spell Watch',
      severity: 'Minor',
      description: `Scattered rain and possible urban flooding in low-lying areas of ${info.city} over the next 48 hours. Avoid underpasses during heavy downpours.`,
      source: 'CIRO Environmental Watch'
    });
  }

  return {
    location: { city: info.city, country: 'Pakistan', lat: info.lat, lon: info.lon },
    current: {
      temp: baseTemp,
      feelsLike: baseTemp + (baseTemp > 30 ? 3 : 0),
      humidity: monsoon ? 68 : 34,
      windSpeed: Math.round(6 + rand() * 14),
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(rand() * 8)],
      uvIndex: baseTemp > 32 ? 9 : baseTemp > 24 ? 6 : 3,
      visibility: smog ? 2.4 : 10,
      pressure: 1006 + Math.round(rand() * 10),
      dewPoint: baseTemp - 9,
      condition: { text: condition, icon: condition.toLowerCase() }
    },
    aqi: {
      aqi: info.aqi,
      status: info.aqi > 150 ? 'Unhealthy' : info.aqi > 100 ? 'Unhealthy for Sensitive Groups' : 'Moderate',
      pm2_5: Math.round(info.aqi * 0.52),
      pm10: Math.round(info.aqi * 0.78),
      no2: Math.round(18 + rand() * 24),
      o3: Math.round(24 + rand() * 30),
      recommendation: info.aqi > 150
        ? 'Avoid prolonged outdoor exertion; children, elderly and respiratory patients should stay indoors.'
        : 'Sensitive groups should reduce extended outdoor activity; general public may continue normal routines.'
    },
    astronomy: { sunrise: '5:42 AM', sunset: '6:51 PM', moonPhase: 'Waxing Crescent' },
    hourly,
    daily,
    history,
    alerts,
    insights: [
      { category: 'Health', advice: smog ? 'Air quality is poor — use N95 masks outdoors and keep inhalers handy.' : 'Hydrate regularly; heat stress risk rises after noon.' },
      { category: 'Sports', advice: monsoon ? 'Indoor sports recommended; outdoor grounds may be slippery.' : 'Early morning is ideal for outdoor training before temperatures peak.' },
      { category: 'Travel', advice: smog ? 'Low visibility on motorways — drive with fog lamps and extra distance.' : 'Road conditions are good; plan travel outside peak heat hours.' },
      { category: 'Clothing', advice: baseTemp > 30 ? 'Light cotton, sunscreen and sunglasses advised.' : 'A light layer for the evening is recommended.' }
    ],
    generatedSummary: `${condition} conditions across ${info.city} at ${baseTemp}°C. ${monsoon ? 'Monsoon activity keeps rain chances elevated through the week.' : 'Dry pattern expected with gradual warming.'} Air quality is ${info.aqi > 150 ? 'a concern — smog persists.' : 'moderate for the region.'}`,
    source: 'fallback'
  };
}

/** Small in-memory cache so repeated city lookups don't hammer the AI. */
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Get full weather intelligence for a location query.
 * @param {string} cityQuery - e.g. "Lahore" or "Karachi, Pakistan"
 * @returns {Promise<object>} WeatherData per the citizen UI contract
 */
async function getWeather(cityQuery) {
  const cacheKey = cityQuery.trim().toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const { apiKey, baseUrl, textModel } = env.dashscope;
  let data = null;

  if (apiKey) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: textModel,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Get real-time weather, 15-day forecast, last 3 days history, active severe weather warnings and precise coordinates for ${cityQuery}, Pakistan.` }
          ],
          temperature: 0.4,
          max_tokens: 3000
        }),
        signal: AbortSignal.timeout(25000)
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        const parsed = extractJson(content);
        if (parsed && parsed.current && parsed.location) {
          data = { ...parsed, source: 'ai' };
        }
      } else {
        const errText = await response.text().catch(() => 'Unknown error');
        console.error(`[weather] Qwen error ${response.status}: ${errText.slice(0, 200)}`);
      }
    } catch (err) {
      console.error(`[weather] AI lookup failed for "${cityQuery}": ${err.message}`);
    }
  }

  if (!data) {
    // Unknown cities get real coordinates from Google Maps Geocoding when a key is set
    const cacheKeyCity = cacheKey.replace(/,.*$/, '');
    const geo = CITY_DB[cacheKeyCity] ? null : await geocodeCity(cityQuery);
    data = buildFallback(cityQuery, geo);
  }

  cache.set(cacheKey, { data, at: Date.now() });
  return data;
}

module.exports = { getWeather };
