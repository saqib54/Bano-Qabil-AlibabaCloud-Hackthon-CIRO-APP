import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from 'react-leaflet';
import { Crosshair, Layers, Moon, Sun } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Marker styling (injected once) ────────────────────────

// Fix default marker icons for Leaflet in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

/** Inject pulse animations + pin styles once for all maps on the page. */
const STYLE_ID = 'ciro-map-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ciro-pin { position: relative; width: 22px; height: 22px; }
    .ciro-pin-dot { position: absolute; inset: 4px; border-radius: 9999px;
      background: var(--pin); border: 2px solid #fff;
      box-shadow: 0 1px 6px rgba(0,0,0,.35); }
    .ciro-pin-pulse { position: absolute; inset: 0; border-radius: 9999px;
      background: var(--pin); opacity: .45;
      animation: ciro-pulse 1.6s ease-out infinite; }
    @keyframes ciro-pulse {
      0% { transform: scale(.55); opacity: .55; }
      100% { transform: scale(2.7); opacity: 0; }
    }
    .ciro-map-ctl { position: absolute; z-index: 1000; display: flex; flex-direction: column;
      gap: 6px; }
    .ciro-map-btn { display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgb(226 232 240);
      background: rgba(255,255,255,.95); color: rgb(15 23 42); cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,.12); transition: transform .15s, background .15s; }
    .ciro-map-btn:hover { transform: translateY(-1px); background: #fff; }
    .ciro-map-btn.active { background: rgb(37 99 235); border-color: rgb(37 99 235); color: #fff; }
  `;
  document.head.appendChild(style);
}

const SEVERITY_COLOR = {
  CRITICAL: '#E11D48',
  HIGH: '#F59E0B',
  MEDIUM: '#2563EB',
  LOW: '#64748B'
};

/** Impact-zone radius per severity (metres). */
const SEVERITY_RADIUS = { CRITICAL: 500, HIGH: 300, MEDIUM: 150 };

function createPinIcon(color, { pulse = false, size = 14 } = {}) {
  const pin = pulse
    ? `<div class="ciro-pin" style="--pin:${color}">
         <div class="ciro-pin-pulse"></div><div class="ciro-pin-dot"></div>
       </div>`
    : `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;
         border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`;
  const box = pulse ? 22 : size;
  return L.divIcon({
    className: 'custom-marker',
    html: pin,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2]
  });
}

const SHELTER_ICON = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:#10B981;width:16px;height:16px;border-radius:4px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold">S</div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const RESPONDER_ICON = createPinIcon('#7C3AED', { size: 14 });

const USER_ICON = L.divIcon({
  className: 'custom-marker',
  html: `<div class="ciro-pin" style="--pin:#2563EB">
           <div class="ciro-pin-pulse"></div><div class="ciro-pin-dot"></div>
         </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

// ── Map helpers ───────────────────────────────────────────

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

function FitBounds({ incidents, shelters }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    incidents?.forEach((i) => {
      if (i.latitude && i.longitude) points.push([i.latitude, i.longitude]);
    });
    shelters?.forEach((s) => {
      if (s.latitude && s.longitude) points.push([s.latitude, s.longitude]);
    });
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, incidents, shelters]);
  return null;
}

/** Flies the viewport to a position exactly once each time it changes. */
function FlyTo({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 0.9 });
  }, [map, pos]);
  return null;
}

const TILES = {
  streets: {
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  tactical: {
    label: 'Tactical',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

/**
 * Shared tactical map — live incidents, safe places, responders.
 * Props (all optional): center, zoom, incidents[], shelters[], responders[],
 * showLegend, minHeight, showNearMe, showTiles, showLayers,
 * impactZones[] ({id, polygon: [[lat,lng]...], color, label}),
 * hotspots[] ({id, latitude, longitude, radius_m, category, risk_score})
 */
export default function CiroMap({
  center = [32.5, 74.535],
  zoom = 13,
  incidents = [],
  shelters = [],
  responders = [],
  showLegend = true,
  minHeight = 400,
  showNearMe = true,
  showTiles = true,
  showLayers = true,
  impactZones = [],
  hotspots = []
}) {
  const [tile, setTile] = useState('streets');
  const [layerState, setLayerState] = useState({ incidents: true, shelters: true, responders: true, ai: true });
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const hasResponders = responders.length > 0;
  const hasShelters = shelters.length > 0;
  const hasAiLayers = impactZones.length > 0 || hotspots.length > 0;

  /** Nearest safe place from the located user, computed client-side. */
  const nearestShelter = useMemo(() => {
    if (!userPos || !hasShelters) return null;
    let nearest = null;
    for (const s of shelters) {
      if (!s.latitude || !s.longitude) continue;
      const distance = haversineMeters(userPos[0], userPos[1], s.latitude, s.longitude);
      if (!nearest || distance < nearest.distance) nearest = { name: s.name, distance };
    }
    return nearest;
  }, [userPos, shelters, hasShelters]);

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoError('Location not supported on this device');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setGeoError('Location permission denied');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full rounded-2xl"
        style={{ minHeight }}
        scrollWheelZoom
      >
        <TileLayer key={tile} attribution={TILES[tile].attribution} url={TILES[tile].url} />
        <FitBounds incidents={incidents} shelters={shelters} />
        <FlyTo pos={userPos} />

        {/* Incident markers + impact zones */}
        {layerState.incidents && incidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          const severity = inc.verified_severity || inc.ai_recommended_severity || 'MEDIUM';
          const color = SEVERITY_COLOR[severity] || SEVERITY_COLOR.MEDIUM;
          const critical = severity === 'CRITICAL' || severity === 'HIGH';
          return (
            <span key={inc.id}>
              <Marker
                position={[inc.latitude, inc.longitude]}
                icon={createPinIcon(color, { pulse: critical })}
                zIndexOffset={critical ? 1000 : 0}
              >
                <Popup>
                  <div className="min-w-[170px]">
                    <p className="text-xs font-bold">{inc.incident_number}</p>
                    <p className="text-sm font-semibold">{inc.title}</p>
                    <p className="text-xs text-gray-500">{inc.category} · {inc.status?.replace('_', ' ')} · {severity}</p>
                    {inc.location_name && <p className="text-xs text-gray-500 mt-0.5">{inc.location_name}</p>}
                    {critical && (
                      <p className="mt-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                        IMPACT ZONE {SEVERITY_RADIUS[severity]} m
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
              {critical && (
                <Circle
                  center={[inc.latitude, inc.longitude]}
                  radius={SEVERITY_RADIUS[severity]}
                  pathOptions={{ color, weight: 1, opacity: 0.5, fillColor: color, fillOpacity: 0.07 }}
                />
              )}
            </span>
          );
        })}

        {/* AI Geo-Impact zones (verified incidents) + forecast hotspots */}
        {layerState.ai && impactZones.map((zone) => (
          Array.isArray(zone?.polygon) && zone.polygon.length >= 3 ? (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              pathOptions={{
                color: zone.color || '#E11D48',
                weight: 2,
                opacity: 0.8,
                fillColor: zone.color || '#E11D48',
                fillOpacity: 0.12,
                dashArray: zone.kind === 'private' ? '6 6' : undefined
              }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <p className="text-xs font-bold text-rose-600">AI IMPACT ZONE</p>
                  {zone.label && <p className="text-xs text-gray-600">{zone.label}</p>}
                  {zone.affected > 0 && (
                    <p className="text-xs text-gray-600">~{zone.affected.toLocaleString()} people in zone</p>
                  )}
                </div>
              </Popup>
            </Polygon>
          ) : null
        ))}
        {layerState.ai && hotspots.map((h) => {
          if (!h.latitude || !h.longitude) return null;
          const risk = Number(h.risk_score) || 0;
          const color = risk >= 60 ? '#E11D48' : risk >= 35 ? '#F59E0B' : '#2563EB';
          return (
            <Circle
              key={h.id}
              center={[h.latitude, h.longitude]}
              radius={h.radius_m || 700}
              pathOptions={{ color, weight: 1.5, opacity: 0.7, dashArray: '5 5', fillColor: color, fillOpacity: 0.08 }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <p className="text-xs font-bold" style={{ color }}>PREDICTED HOTSPOT</p>
                  {h.category && <p className="text-xs text-gray-600">{String(h.category).replace('_', ' ')}</p>}
                  <p className="text-xs text-gray-600">Risk score: {risk} · {h.incident_count} recent incidents</p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Shelter markers */}
        {layerState.shelters && shelters.map((s) => {
          if (!s.latitude || !s.longitude) return null;
          return (
            <Marker key={s.id} position={[s.latitude, s.longitude]} icon={SHELTER_ICON}>
              <Popup>
                <div className="min-w-[160px]">
                  <p className="text-xs font-semibold text-green-700">{s.type?.replace('_', ' ')}</p>
                  <p className="text-sm font-bold">{s.name}</p>
                  {s.address && <p className="text-xs text-gray-500">{s.address}</p>}
                  {s.capacity && <p className="text-xs text-gray-500">Capacity: {s.capacity}</p>}
                  {s.contact && <p className="text-xs text-gray-500">Contact: {s.contact}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Responder markers */}
        {layerState.responders && responders.map((r) => {
          if (!r.current_lat || !r.current_lng) return null;
          return (
            <Marker key={r.user_id} position={[r.current_lat, r.current_lng]} icon={RESPONDER_ICON}>
              <Popup>
                <div className="min-w-[140px]">
                  <p className="text-xs font-semibold text-purple-700">Responder</p>
                  <p className="text-sm font-bold">{r.full_name}</p>
                  <p className="text-xs text-gray-500">{r.designation}</p>
                  <p className="text-xs text-gray-500">{r.department_name} · {r.duty_status}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* User location */}
        {userPos && (
          <span>
            <Marker position={userPos} icon={USER_ICON} zIndexOffset={2000}>
              <Popup>
                <div className="min-w-[130px]">
                  <p className="text-sm font-bold">You are here</p>
                  {nearestShelter && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Nearest safe place: {nearestShelter.name} · {Math.round(nearestShelter.distance)} m
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={userPos}
              radius={500}
              pathOptions={{ color: '#2563EB', weight: 1, opacity: 0.4, fillColor: '#2563EB', fillOpacity: 0.05 }}
            />
          </span>
        )}
      </MapContainer>

      {/* Map controls — locate / tiles / layers */}
      <div className="ciro-map-ctl right-3 top-3">
        {showNearMe && (
          <button
            type="button"
            onClick={locateMe}
            className={`ciro-map-btn ${locating ? 'active' : ''}`}
            title={locating ? 'Locating…' : 'Locate me — shows nearest safe place'}
          >
            <Crosshair className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
          </button>
        )}
        {showTiles && (
          <button
            type="button"
            onClick={() => setTile(tile === 'streets' ? 'tactical' : 'streets')}
            className="ciro-map-btn"
            title={tile === 'streets' ? 'Switch to tactical dark view' : 'Switch to street view'}
          >
            {tile === 'streets' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        )}
      </div>

      {showLayers && (incidents.length > 0 || hasShelters || hasResponders) && (
        <div className="ciro-map-ctl left-3 top-3 rounded-xl border border-line bg-white/95 p-2 shadow-md backdrop-blur">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
            <Layers className="h-3 w-3" /> Layers
          </p>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-ink">
            <input
              type="checkbox"
              checked={layerState.incidents}
              onChange={(e) => setLayerState((s) => ({ ...s, incidents: e.target.checked }))}
              className="rounded border-line text-brand focus:ring-brand"
            />
            Incidents
          </label>
          {hasShelters && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-ink">
              <input
                type="checkbox"
                checked={layerState.shelters}
                onChange={(e) => setLayerState((s) => ({ ...s, shelters: e.target.checked }))}
                className="rounded border-line text-brand focus:ring-brand"
              />
              Safe places
            </label>
          )}
          {hasResponders && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-ink">
              <input
                type="checkbox"
                checked={layerState.responders}
                onChange={(e) => setLayerState((s) => ({ ...s, responders: e.target.checked }))}
                className="rounded border-line text-brand focus:ring-brand"
              />
              Responders
            </label>
          )}
          {hasAiLayers && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-ink">
              <input
                type="checkbox"
                checked={layerState.ai}
                onChange={(e) => setLayerState((s) => ({ ...s, ai: e.target.checked }))}
                className="rounded border-line text-brand focus:ring-brand"
              />
              AI zones & hotspots
            </label>
          )}
        </div>
      )}

      {geoError && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-danger px-3 py-1 text-[10px] font-bold text-white shadow-md">
          {geoError}
        </div>
      )}

      {nearestShelter && (
        <div className="absolute bottom-14 left-3 z-[1000] rounded-full border border-safe/30 bg-white/95 px-3 py-1 text-[10px] font-bold text-safe shadow-md backdrop-blur">
          Nearest safe place: {nearestShelter.name} · {Math.round(nearestShelter.distance)} m
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 z-[1000] rounded-xl bg-white/90 p-3 shadow-md text-xs space-y-1.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#E11D48]" /> Critical
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#F59E0B]" /> High
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#2563EB]" /> Medium
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-[#10B981]" /> Shelter
          </div>
          {hasResponders && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-[#7C3AED]" /> Responder
            </div>
          )}
          {impactZones.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm border-2 border-[#E11D48] bg-[#E11D48]/15" /> AI impact zone
            </div>
          )}
          {hotspots.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-[#F59E0B]" /> Predicted hotspot
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#2563EB] ring-2 ring-blue-200" /> You
          </div>
        </div>
      )}
    </div>
  );
}
