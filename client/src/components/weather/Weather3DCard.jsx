import { useRef, useState, useEffect } from 'react';
import { MapPin, Radio } from 'lucide-react';
import { WeatherIcon, getIconColor } from './WeatherIcons';

/**
 * 3D tilt weather hero card — glass body, dynamic condition glow,
 * parallax layers on mouse-move (auto-sway on mobile).
 */
export default function Weather3DCard({ data }) {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e) => {
    if (isMobile || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotation({
      x: ((y - centerY) / centerY) * -12,
      y: ((x - centerX) / centerX) * 12
    });
  };

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

  const conditionText = data.current.condition.text;
  const iconKeyword = data.current.condition.icon || conditionText;

  return (
    <div className="w-full max-w-lg mx-auto my-8 px-4" style={{ perspective: '1000px' }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full aspect-[4/5] rounded-[3rem] transition-transform duration-300 ease-out cursor-pointer ${isMobile ? 'animate-sway' : ''}`}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Main glass body */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/30 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/20" />

        {/* Dynamic glow */}
        <div className={`absolute -inset-4 rounded-[3.5rem] blur-3xl opacity-20 pointer-events-none ${getIconColor(iconKeyword).replace('text', 'bg')}`} />

        {/* Content layer */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-8 sm:p-10 text-white"
          style={{ transform: 'translateZ(40px)', transformStyle: 'preserve-3d' }}
        >
          {/* Top status */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md w-fit">
                <Radio size={12} className="text-red-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Live Forecast</span>
              </div>
              <div className="flex items-center space-x-2 text-white mt-2">
                <MapPin size={18} className="text-white/60" />
                <h2 className="text-xl font-black tracking-tight">{data.location.city}</h2>
              </div>
              <p className="text-xs text-white/40 font-bold ml-6 uppercase tracking-tighter">{data.location.country}</p>
            </div>

            <div className={`${getIconColor(iconKeyword)} animate-bounce-slow drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]`}>
              <WeatherIcon type={iconKeyword} className="w-20 h-20" />
            </div>
          </div>

          {/* Central temperature display */}
          <div className="flex flex-col items-center justify-center my-4" style={{ transform: 'translateZ(60px)' }}>
            <div className="relative">
              <h1 className="text-8xl sm:text-9xl font-black leading-none tracking-tighter drop-shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">
                {Math.round(data.current.temp)}
              </h1>
              <span className="absolute top-2 -right-7 text-5xl font-thin text-white/50">°</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="h-[2px] w-8 bg-white/20 rounded-full"></span>
              <p className="text-lg sm:text-xl font-black uppercase tracking-[0.2em] text-white/80">{conditionText}</p>
              <span className="h-[2px] w-8 bg-white/20 rounded-full"></span>
            </div>
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mt-2">Sensory: {Math.round(data.current.feelsLike)}°C</p>
          </div>

          {/* AI briefing */}
          <div className="bg-black/30 rounded-3xl p-5 backdrop-blur-2xl border border-white/10 shadow-2xl" style={{ transform: 'translateZ(20px)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></div>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Meteorologist Analysis</span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-white/90">
              {data.generatedSummary || `Currently reporting ${conditionText.toLowerCase()} across ${data.location.city}. Atmospheric pressure sitting at ${data.current.pressure}mb with visibility extended to ${data.current.visibility}km.`}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotateX(2deg) rotateY(2deg); }
          50% { transform: rotateX(-2deg) rotateY(-2deg); }
        }
        .animate-sway { animation: sway 6s ease-in-out infinite; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
