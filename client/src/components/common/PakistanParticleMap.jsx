import { useId, useMemo } from 'react';

/**
 * Prototype hero art — dotted "particle" map of Pakistan with a network
 * mesh, glowing city nodes and the CIRO shield emblem (§70 design system).
 * Fully deterministic (seeded PRNG) so every render matches the prototype.
 */

// Coarse Pakistan outline (lng, lat) — stylised, matches prototype silhouette
const OUTLINE = [
  [61.6, 25.2], [63.2, 25.2], [64.6, 25.2], [65.9, 25.3], [66.4, 24.8],
  [67.3, 24.2], [68.7, 23.7], [70.2, 24.3], [70.9, 25.7], [71.3, 26.7],
  [72.6, 27.4], [73.9, 28.0], [75.0, 29.2], [75.8, 30.2], [75.0, 31.2],
  [74.6, 32.0], [74.0, 32.8], [74.4, 33.6], [74.0, 34.4], [74.6, 35.0],
  [75.7, 35.6], [76.8, 36.2], [77.9, 35.6], [76.0, 36.9], [74.9, 37.3],
  [73.6, 37.1], [72.4, 36.9], [71.5, 36.5], [71.1, 35.9], [70.9, 35.2],
  [70.3, 34.4], [69.9, 33.6], [69.4, 32.8], [68.9, 32.3], [68.2, 31.8],
  [67.3, 31.5], [66.5, 31.1], [66.2, 30.3], [66.6, 29.7], [65.6, 29.4],
  [64.4, 29.4], [63.3, 29.3], [62.3, 29.1], [61.3, 29.3], [60.9, 29.6],
  [60.9, 28.6], [61.7, 28.1], [62.2, 27.4], [62.9, 26.9], [63.4, 26.4],
  [64.2, 25.9], [65.0, 25.5]
];

const CITIES = [
  { name: 'Peshawar', lng: 71.5, lat: 34.0, tone: 'green' },
  { name: 'Islamabad', lng: 73.1, lat: 33.7, tone: 'blue' },
  { name: 'Lahore', lng: 74.3, lat: 31.5, tone: 'red' },
  { name: 'Quetta', lng: 67.0, lat: 30.2, tone: 'green' },
  { name: 'Karachi', lng: 67.0, lat: 24.9, tone: 'blue' }
];

const NODE_TONE = {
  green: '#22C55E',
  blue: '#2563EB',
  red: '#EF4444'
};

const W = 400;
const H = 440;
const project = (lng, lat) => [
  ((lng - 60) / (78.5 - 60)) * W,
  ((37.8 - lat) / (37.8 - 23.2)) * H
];

/** Deterministic PRNG so the artwork never changes between renders. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function buildArt() {
  const rand = mulberry32(20260830);
  const poly = OUTLINE.map(([lng, lat]) => project(lng, lat));

  // Particle dots sampled inside the outline
  const dots = [];
  let guard = 0;
  while (dots.length < 620 && guard < 9000) {
    guard += 1;
    const x = rand() * W;
    const y = rand() * H;
    if (!insidePolygon(x, y, poly)) continue;
    const greenWeight = Math.min(1, Math.max(0, (y / H) * 0.55 + (x / W) * 0.45 + (rand() - 0.5) * 0.5));
    dots.push({ x, y, r: 0.7 + rand() * 1.1, o: 0.35 + rand() * 0.65, g: greenWeight });
  }

  // Network hubs + links between nearest hubs
  const hubs = dots.filter((_, i) => i % 17 === 0).slice(0, 42);
  const links = [];
  hubs.forEach((h, i) => {
    const near = hubs
      .map((o, j) => ({ j, d: (o.x - h.x) ** 2 + (o.y - h.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    near.forEach((n) => {
      if (n.j > i) links.push([h, hubs[n.j]]);
    });
  });

  return { dots, hubs, links };
}

const ART = buildArt();

export default function PakistanParticleMap({
  showCities = false,
  showLabels = false,
  showShield = false,
  emergency = false,
  className = ''
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const cityNodes = useMemo(() => CITIES.map((c) => ({ ...c, x: project(c.lng, c.lat)[0], y: project(c.lng, c.lat)[1] })), []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`dot${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id={`shield${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <radialGradient id={`halo${uid}`}>
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft halo behind the country */}
      <circle cx={W / 2} cy={H / 2} r={H * 0.48} fill={`url(#halo${uid})`} opacity="0.35" />

      {/* orbit rings */}
      <circle cx={W / 2} cy={H / 2} r={H * 0.42} fill="none" stroke="#93C5FD" strokeOpacity="0.25" strokeDasharray="2 6" />
      <circle cx={W / 2} cy={H / 2} r={H * 0.33} fill="none" stroke="#93C5FD" strokeOpacity="0.18" strokeDasharray="1 5" />

      {/* network links */}
      {ART.links.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7DD3FC" strokeOpacity="0.35" strokeWidth="0.6" />
      ))}

      {/* particle dots */}
      {ART.dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          opacity={d.o}
          fill={d.g > 0.62 ? '#10B981' : d.g > 0.45 ? '#0EA5E9' : '#2563EB'}
        />
      ))}

      {/* glowing hub nodes */}
      {ART.hubs.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r="2.1" fill="#E0F2FE" opacity="0.9" />
      ))}

      {/* city nodes */}
      {showCities && cityNodes.map((c) => (
        <g key={c.name}>
          {c.tone === 'red' && (
            <>
              <circle cx={c.x} cy={c.y} r="16" fill={NODE_TONE.red} opacity="0.15" />
              <circle cx={c.x} cy={c.y} r="11" fill={NODE_TONE.red} opacity="0.2" />
            </>
          )}
          <circle cx={c.x} cy={c.y} r="9" fill={NODE_TONE[c.tone]} opacity="0.3" />
          <circle cx={c.x} cy={c.y} r="5.5" fill={NODE_TONE[c.tone]} stroke="#fff" strokeWidth="2" />
          <circle cx={c.x} cy={c.y} r="1.8" fill="#fff" />
          {showLabels && (
            <g transform={`translate(${c.x + 12}, ${c.y - 8})`}>
              <rect width={c.name.length * 6.4 + 14} height="17" rx="5" fill="#F8FAFC" opacity="0.95" />
              <text x="7" y="12" fontSize="10" fontWeight="600" fill="#0A1E42">{c.name}</text>
            </g>
          )}
        </g>
      ))}

      {/* emergency pulse (used on consent / location screens) */}
      {emergency && (
        <g transform={`translate(${project(74.3, 31.5)[0]}, ${project(74.3, 31.5)[1] + 26})`}>
          <circle r="14" fill="#EF4444" opacity="0.18" />
          <circle r="9" fill="#EF4444" opacity="0.3" />
          <circle r="4.5" fill="#EF4444" stroke="#fff" strokeWidth="1.5" />
          <path d="M -26 0 L -14 0 L -10 -6 L -5 6 L -1 0 L 12 0" stroke="#FCA5A5" strokeWidth="1.4" fill="none" />
        </g>
      )}

      {/* CIRO shield emblem */}
      {showShield && (
        <g transform={`translate(${W / 2 - 42}, ${H / 2 - 78})`}>
          <path
            d="M42 0 L84 14 V46 C84 74 66 92 42 104 C18 92 0 74 0 46 V14 Z"
            fill={`url(#shield${uid})`}
            stroke="#BFDBFE"
            strokeWidth="3"
          />
          <path
            d="M42 26 C36 26 32 30 32 36 V44 H28 V68 H56 V44 H52 V36 C52 30 48 26 42 26 Z M42 50 c-3 0-5 2-5 5 v6 h10 v-6 c0-3-2-5-5-5 z"
            fill="#fff"
            fillRule="evenodd"
            opacity="0.95"
          />
        </g>
      )}
    </svg>
  );
}
