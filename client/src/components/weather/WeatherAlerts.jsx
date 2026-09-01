import { AlertTriangle, Info } from 'lucide-react';

/** Severe weather alert banners — severity-tinted, pulse-animated. */
export default function WeatherAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'Extreme': return 'bg-red-900/60 border-red-500 text-red-100';
      case 'Severe': return 'bg-orange-900/60 border-orange-500 text-orange-100';
      default: return 'bg-amber-900/60 border-amber-500 text-amber-100';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-4 p-4 rounded-2xl border backdrop-blur-xl shadow-lg ${getSeverityStyles(alert.severity)}`}
          >
            <div className="p-2 bg-white/10 rounded-full flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1 gap-3">
                <h4 className="font-bold text-sm uppercase tracking-wide">{alert.title}</h4>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">{alert.severity}</span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed mb-2">{alert.description}</p>
              <div className="flex items-center gap-1 text-[10px] opacity-60">
                <Info size={10} />
                <span>Source: {alert.source}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
