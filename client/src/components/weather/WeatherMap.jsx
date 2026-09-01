import { useState } from 'react';
import { Layers, CloudRain, Wind, Thermometer, Cloud } from 'lucide-react';

/** Live Windy radar/wind/temp/cloud layers centered on the city coordinates. */
export default function WeatherMap({ lat, lon }) {
  const [overlay, setOverlay] = useState('radar');

  const embedUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=8&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  const tabs = [
    { id: 'radar', icon: <CloudRain size={16} />, label: 'Radar' },
    { id: 'wind', icon: <Wind size={16} />, label: 'Wind' },
    { id: 'temp', icon: <Thermometer size={16} />, label: 'Temp' },
    { id: 'clouds', icon: <Cloud size={16} />, label: 'Clouds' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 my-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pl-2">
        <div className="flex items-center gap-2">
          <Layers className="text-white/80" size={20} />
          <h3 className="text-white/80 text-lg font-medium">Advanced Weather Layers</h3>
        </div>

        <div className="flex bg-white/5 backdrop-blur-md rounded-xl p-1 border border-white/10 self-start">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setOverlay(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${overlay === tab.id ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-black/20 backdrop-blur-xl">
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title="Advanced Weather Map"
          className="w-full h-full border-0"
          loading="lazy"
        ></iframe>

        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white/70 text-[10px] px-2 py-1 rounded-full border border-white/10 uppercase tracking-widest font-bold">
          Live {overlay} data
        </div>
      </div>
    </div>
  );
}
