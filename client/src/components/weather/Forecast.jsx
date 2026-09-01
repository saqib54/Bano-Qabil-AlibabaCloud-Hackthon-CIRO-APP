import { Calendar, History, Droplets } from 'lucide-react';
import { WeatherIcon } from './WeatherIcons';

/** Hourly timeline + 15-day outlook + meteorological history. */
export default function Forecast({ data }) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 my-8 space-y-12">
      {/* Hourly section */}
      <section>
        <h3 className="text-white/80 text-lg font-black uppercase tracking-widest mb-6 pl-2 flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg"><Calendar size={18} className="text-blue-400" /></div> Hourly Timeline
        </h3>
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar snap-x">
          {(data.hourly || []).map((hour, idx) => (
            <div
              key={idx}
              className="snap-start flex-shrink-0 w-24 flex flex-col items-center justify-center p-4 rounded-[2rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/15 transition-all duration-300 group"
            >
              <span className="text-[10px] font-black uppercase tracking-tighter text-white/40 mb-2 group-hover:text-white/60 transition-colors">{hour.time}</span>
              <div className="my-2 text-white transform group-hover:scale-110 transition-transform">
                <WeatherIcon type={hour.condition} className="w-8 h-8" />
              </div>
              <span className="text-xl font-black text-white">{Math.round(hour.temp)}°</span>
              {hour.precipChance > 0 && (
                <div className="mt-2 flex items-center gap-1 text-blue-300 text-[10px] font-black bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  <Droplets size={8} /> {hour.precipChance}%
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Daily section (15 days) */}
      <section>
        <h3 className="text-white/80 text-lg font-black uppercase tracking-widest mb-6 pl-2 flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg"><Calendar size={18} className="text-purple-400" /></div> 15-Day Outlook
        </h3>
        <div className="bg-white/5 rounded-[3rem] backdrop-blur-3xl border border-white/10 p-4 sm:p-8 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar shadow-2xl">
          {(data.daily || []).map((day, idx) => (
            <div key={idx} className="flex items-center justify-between text-white group hover:bg-white/[0.07] p-4 rounded-[1.5rem] transition-all duration-300 border border-transparent hover:border-white/5">
              <div className="flex flex-col w-24 sm:w-28">
                <span className="font-black text-sm uppercase tracking-tight">{day.day}</span>
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{day.date}</span>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-center">
                <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                  <WeatherIcon type={day.condition} className="w-6 h-6" />
                </div>
                {day.rainChance > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 font-black uppercase">
                    <Droplets size={10} />
                    <span>{day.rainChance}% Precip</span>
                  </div>
                )}
              </div>

              <div className="w-32 sm:w-40 flex items-center justify-end gap-3 sm:gap-5">
                <span className="text-white/30 text-xs font-black w-8 text-right">{Math.round(day.low)}°</span>
                <div className="flex-1 max-w-[60px] h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                  <div
                    className="absolute h-full bg-gradient-to-r from-blue-400 via-yellow-400 to-orange-400 opacity-60 rounded-full"
                    style={{ left: '15%', right: '15%' }}
                  ></div>
                </div>
                <span className="font-black text-sm w-8 text-left">{Math.round(day.high)}°</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* History section */}
      {data.history && data.history.length > 0 && (
        <section>
          <h3 className="text-white/60 text-[10px] uppercase font-black tracking-[0.3em] mb-6 pl-2 flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-md"><History size={14} /></div> Meteorological History
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.history.map((day, idx) => (
              <div
                key={idx}
                className="relative group overflow-hidden bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent rounded-[2rem] border border-white/10 p-5 flex flex-col items-center transition-all duration-500 hover:scale-[1.02] hover:bg-white/[0.12] hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-white/20"
              >
                <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                  <History size={100} />
                </div>

                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-3 bg-white/5 px-3 py-1 rounded-full border border-white/5">{day.date}</span>

                <div className="flex flex-col items-center mb-4">
                  <div className="p-3 rounded-2xl bg-white/5 mb-3 group-hover:bg-white/10 transition-colors shadow-inner">
                    <WeatherIcon type={day.condition} className="w-8 h-8 text-white/60 group-hover:text-white/90 transition-colors" />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-wider text-white/50 group-hover:text-white/80">{day.condition}</span>
                </div>

                <div className="w-full flex justify-center gap-6 pt-4 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-white/30 tracking-tighter mb-1">Min</p>
                    <p className="text-sm font-black text-blue-300/80">{day.low}°</p>
                  </div>
                  <div className="w-[1px] h-6 bg-white/5 self-end mb-1"></div>
                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black text-white/30 tracking-tighter mb-1">Max</p>
                    <p className="text-sm font-black text-yellow-300/80">{day.high}°</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
