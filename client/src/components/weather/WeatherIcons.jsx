import { Sun, CloudSun, Cloud, CloudRain, CloudLightning, CloudSnow, CloudFog } from 'lucide-react';

/**
 * Weather condition icons — maps condition keywords to lucide glyphs.
 * Mirrors the WeatherIcon/getIconColor contract of the prototype weather UI.
 */
export function WeatherIcon({ type = '', className = 'w-6 h-6' }) {
  const t = String(type).toLowerCase();
  if (t.includes('thunder') || t.includes('storm')) return <CloudLightning className={className} />;
  if (t.includes('snow')) return <CloudSnow className={className} />;
  if (t.includes('rain') || t.includes('drizzle') || t.includes('shower')) return <CloudRain className={className} />;
  if (t.includes('fog') || t.includes('haze') || t.includes('smog') || t.includes('mist')) return <CloudFog className={className} />;
  if (t.includes('partly')) return <CloudSun className={className} />;
  if (t.includes('cloud') || t.includes('overcast')) return <Cloud className={className} />;
  return <Sun className={className} />;
}

/** Glow color per condition — used by the 3D card dynamic glow + icon tint. */
export function getIconColor(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('thunder') || t.includes('storm')) return 'text-purple-400';
  if (t.includes('rain') || t.includes('drizzle')) return 'text-blue-400';
  if (t.includes('snow')) return 'text-cyan-200';
  if (t.includes('fog') || t.includes('haze') || t.includes('smog')) return 'text-gray-300';
  if (t.includes('partly') || t.includes('cloud')) return 'text-white/70';
  return 'text-yellow-300';
}
