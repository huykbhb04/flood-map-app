
import React, { useMemo } from 'react';
import { Station, Status, WeatherStation } from '../types';
import { 
  X, 
  Droplets, 
  AlertOctagon, 
  CloudRain, 
  Sun, 
  Cloud,
  TrendingUp,
  TrendingDown,
  Minus,
  WifiOff
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend, Bar } from 'recharts';

interface Props {
  station: Station;
  onClose: () => void;
  nearestWeather?: WeatherStation | null;
}

const StationDetailPanel: React.FC<Props> = ({ station, onClose, nearestWeather }) => {
  // Use nearestWeather passed from props (calculated in App.tsx) or fallback to station.weatherData
  const weather = nearestWeather || station.weatherData;

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.DANGER: return 'text-red-500';
      case Status.WARNING: return 'text-amber-500';
      default: return 'text-emerald-500';
    }
  };

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case Status.DANGER: return 'bg-red-500/20 text-red-400 border-red-500/50';
      case Status.WARNING: return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    }
  };

  // Helper to render weather icon based on status text
  const getWeatherIcon = (statusStr: string) => {
    if (!statusStr) return <Cloud size={16} className="text-slate-400" />;
    const s = statusStr.toLowerCase();
    if (s.includes('mưa')) return <CloudRain size={16} className="text-blue-400" />;
    if (s.includes('nắng') || s.includes('quang')) return <Sun size={16} className="text-yellow-400" />;
    return <Cloud size={16} className="text-slate-400" />;
  };

  // --- WEATHER FORECAST LOGIC ---
  const forecastAnalysis = useMemo(() => {
    if (!weather || !weather.predict || !weather.predict.forecast) return null;

    const forecast = weather.predict.forecast;
    const currentHum = weather.humidity;
    
    // Calculate trend based on average of forecast vs current
    const avgForecastHum = forecast.reduce((acc, p) => acc + p.humidity, 0) / forecast.length;
    
    let summary = "";
    let trendIcon = <Minus size={20} className="text-slate-400" />;

    // Logic for interpretation based on humidity trend
    if (avgForecastHum < currentHum - 2) {
      summary = "Nước có xu hướng rút";
      trendIcon = <TrendingDown size={20} className="text-emerald-400" />;
    } else if (avgForecastHum > currentHum + 2) {
      summary = "Nguy cơ nước dâng";
      trendIcon = <TrendingUp size={20} className="text-red-400" />;
    } else {
      summary = "Mực nước ổn định";
    }

    // Prepare chart data
    // Start with Current data at time 0
    const chartData = [
      { 
        time: 0, 
        temp: weather.temperature, 
        hum: weather.humidity, 
        status: weather.predict.current_status || "Current" 
      },
      ...forecast.map(p => ({
        time: p.time,
        temp: p.temperature,
        hum: p.humidity,
        status: p.status
      }))
    ];

    return { summary, trendIcon, chartData };
  }, [weather]);


  return (
    <div className="h-full flex flex-col bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-slate-700 flex justify-between items-start bg-slate-900/50">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Station ID: {station.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadge(station.status)} font-bold`}>
              {station.status}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">{station.name}</h2>
          <p className="text-slate-400 text-sm flex items-center mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
            {station.location}
          </p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 custom-scrollbar">
        
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {/* Water Level */}
          <div className="bg-slate-700/50 p-3 md:p-4 rounded-lg border border-slate-600 text-center flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5" style={{ height: `${Math.min(100, station.currentLevel)}%`, bottom: 0, top: 'auto', transition: 'height 0.5s' }}></div>
            <div className="text-slate-400 text-xs mb-1 flex items-center justify-center gap-1 z-10">
               <Droplets size={12} /> Water Level
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(station.status)} z-10`}>
              {station.currentLevel} <span className="text-sm text-slate-500">cm</span>
            </div>
          </div>

          {/* Threshold Display (Read Only) */}
          <div className="bg-slate-700/50 p-3 md:p-4 rounded-lg border border-slate-600 text-center flex flex-col justify-center relative">
            <div className="text-slate-400 text-xs mb-1 flex items-center justify-center gap-1">
              <AlertOctagon size={12} /> Danger Threshold
            </div>
            <div className="group relative">
              <div className="text-3xl font-bold text-white">
                {station.threshold} <span className="text-sm text-slate-500">cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Weather Brief (Top Card) */}
        {weather ? (
          <div className="bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden">
             <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <CloudRain className="text-blue-400" size={16} />
                   <h3 className="text-sm font-bold text-slate-200">Weather Station</h3>
                   {/* LIVE / SIMULATION BADGE */}
                   {weather.isMock ? (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                         <WifiOff size={10} className="text-amber-400" />
                         <span className="text-[9px] font-bold text-amber-400 uppercase">SIMULATION</span>
                      </div>
                   ) : (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                         <span className="text-[9px] font-bold text-emerald-400 uppercase">LIVE API</span>
                      </div>
                   )}
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                  {weather.station} ({station.distanceToWeatherStation?.toFixed(1)}km)
                </span>
             </div>
             <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-700 rounded-full">
                      {getWeatherIcon(weather.predict.current_status)}
                   </div>
                   <div>
                      <div className="text-xl font-bold text-white">{weather.temperature}°C</div>
                      <div className="text-xs text-slate-400 capitalize">{weather.predict.current_status}</div>
                   </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                   <div>Humidity: <span className="text-blue-400 font-bold">{weather.humidity}%</span></div>
                   <div>Pressure: {weather.pressure}hPa</div>
                </div>
             </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-800/50 border border-slate-700 border-dashed rounded-lg text-center">
             <p className="text-xs text-slate-500">Không có trạm thời tiết gần điểm ngập này.</p>
          </div>
        )}

        {/* Water Level Trend Chart */}
        <div>
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-bold text-slate-300">Water Level Trend</h3>
             {station.blynkToken && (
               <div className="flex items-center gap-1 text-xs text-emerald-400">
                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                 Live Data
               </div>
             )}
          </div>
          <div className="h-32 md:h-48 w-full bg-slate-900/50 rounded-lg border border-slate-700 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={station.history}>
                <defs>
                  <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  unit="cm"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                  itemStyle={{ color: '#93c5fd' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorLevel)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WEATHER-BASED FORECAST (Replaces AI Risk Analyst) */}
        <div className="border-t border-slate-700 pt-4">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 text-indigo-400">
               <CloudRain size={20} />
               <h3 className="font-bold text-white">Weather-based Flood Forecast</h3>
             </div>
           </div>

           {weather && forecastAnalysis ? (
             <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700">
               {/* Analysis Text */}
               <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-slate-800 rounded-full border border-slate-600">
                    {forecastAnalysis.trendIcon}
                  </div>
                  <div>
                    <p className="text-sm text-slate-200 font-medium leading-relaxed">
                      {forecastAnalysis.summary}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Forecast 3h • Updated {new Date(weather.created_at).toLocaleTimeString()}
                    </p>
                  </div>
               </div>

               {/* Forecast Chart */}
               <div className="h-48 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastAnalysis.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#64748b" 
                        fontSize={10}
                        unit="m"
                        tickFormatter={(val) => `+${val}m`}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#93c5fd" 
                        fontSize={10} 
                        domain={[0, 100]}
                        unit="%"
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#fca5a5" 
                        fontSize={10}
                        domain={['auto', 'auto']}
                        unit="°C"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: '12px' }}
                        labelFormatter={(val) => `+${val} mins`}
                      />
                      <Legend iconSize={8} fontSize={10} wrapperStyle={{ fontSize: '10px' }} />
                      
                      <Bar 
                        yAxisId="left" 
                        dataKey="hum" 
                        name="Humidity (%)" 
                        fill="#3b82f6" 
                        barSize={20} 
                        opacity={0.6}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="temp" 
                        name="Temp (°C)" 
                        stroke="#f87171" 
                        strokeWidth={2} 
                        dot={{ r: 3 }} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
               </div>
             </div>
           ) : (
             <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 border-dashed text-center">
                <p className="text-sm text-slate-500">
                  {weather ? "Không có dữ liệu dự báo thời tiết." : "Không có trạm thời tiết gần điểm ngập này."}
                </p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default StationDetailPanel;
