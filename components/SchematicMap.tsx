import React from 'react';
import { StationData, StatusLevel } from '../types';
import { MapPin, Waves } from 'lucide-react';

interface Props {
  stations: StationData[];
  onStationSelect: (station: StationData) => void;
  selectedStationId?: string;
}

export const SchematicMap: React.FC<Props> = ({ stations, onStationSelect, selectedStationId }) => {
  // Helper to get color based on status
  const getColor = (status: StatusLevel) => {
    switch (status) {
      case StatusLevel.DANGER: return '#ef4444';
      case StatusLevel.WARNING: return '#f59e0b';
      case StatusLevel.SAFE: return '#10b981';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
      {/* Background Map Representation - Simplified City/River Layout */}
      <svg className="w-full h-full absolute top-0 left-0 pointer-events-none opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* River Path */}
        <path d="M0,20 C30,20 30,40 60,40 C90,40 90,60 100,60 V80 C80,80 50,60 30,60 C10,60 10,40 0,40 Z" fill="#3b82f6" />
        {/* City Blocks */}
        <rect x="10" y="10" width="15" height="15" fill="#cbd5e1" />
        <rect x="35" y="5" width="20" height="25" fill="#cbd5e1" />
        <rect x="70" y="10" width="25" height="15" fill="#cbd5e1" />
        <rect x="10" y="60" width="20" height="30" fill="#cbd5e1" />
        <rect x="50" y="70" width="40" height="20" fill="#cbd5e1" />
        {/* Roads */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="#64748b" strokeWidth="0.5" />
        <line x1="30" y1="0" x2="30" y2="100" stroke="#64748b" strokeWidth="0.5" />
        <line x1="65" y1="0" x2="65" y2="100" stroke="#64748b" strokeWidth="0.5" />
      </svg>

      <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur px-3 py-1 rounded text-xs text-slate-300 border border-slate-600 z-10">
        <span className="font-bold text-white">WEB MAP IOT</span> | Real-time View
      </div>

      {/* Interactive Nodes */}
      {stations.map((station) => {
        const isSelected = station.id === selectedStationId;
        const color = getColor(station.status);
        
        return (
          <button
            key={station.id}
            onClick={() => onStationSelect(station)}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 group z-20`}
            style={{ left: `${station.coordinates.x}%`, top: `${station.coordinates.y}%` }}
          >
            {/* Ping Effect for Danger/Warning */}
            {station.status !== StatusLevel.SAFE && (
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-[${color}]`} style={{ backgroundColor: color }}></span>
            )}
            
            {/* Marker Icon */}
            <div className={`
              relative flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-lg transition-transform
              ${isSelected ? 'scale-125 border-white' : 'scale-100 border-slate-200'}
              ${station.status === StatusLevel.DANGER ? 'bg-red-500 text-white' : 
                station.status === StatusLevel.WARNING ? 'bg-yellow-500 text-white' : 'bg-emerald-500 text-white'}
            `}>
              <MapPin size={20} fill="currentColor" className="mt-1" />
            </div>

            {/* Tooltip Label */}
            <div className={`
              absolute top-12 left-1/2 transform -translate-x-1/2 w-max 
              px-3 py-1 rounded-lg text-xs font-bold shadow-lg transition-opacity
              ${isSelected ? 'opacity-100 bg-white text-slate-900' : 'opacity-0 group-hover:opacity-100 bg-slate-800 text-white'}
            `}>
              <div className="flex items-center gap-1">
                <Waves size={12} />
                {station.waterLevel}cm
              </div>
              <div className="text-[10px] font-normal opacity-80">{station.name}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
