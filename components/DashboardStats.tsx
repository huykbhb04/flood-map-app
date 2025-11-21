import React from 'react';
import { Activity, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { DashboardStats as StatsType } from '../types';

interface Props {
  stats: StatsType;
}

const DashboardStats: React.FC<Props> = ({ stats }) => {
  return (
    // Compact grid for mobile: single row (grid-cols-4) with minimal gap
    <div className="grid grid-cols-4 gap-1.5 mb-1 md:mb-6 md:gap-3">
      {/* Active Nodes */}
      <div className="bg-slate-800 rounded-md md:rounded-lg p-1.5 md:p-4 border-t-2 md:border-t-0 md:border-l-4 border-blue-500 shadow-lg flex flex-col md:flex-row items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-wider leading-tight">
            <span className="md:hidden">Active</span>
            <span className="hidden md:inline">Active Nodes</span>
          </p>
          <h3 className="text-sm md:text-2xl font-bold text-white leading-tight">{stats.activeNodes}</h3>
        </div>
        <div className="hidden md:block p-3 bg-slate-700/50 rounded-full text-blue-400">
          <Activity className="w-6 h-6" />
        </div>
      </div>

      {/* Safe Zones */}
      <div className="bg-slate-800 rounded-md md:rounded-lg p-1.5 md:p-4 border-t-2 md:border-t-0 md:border-l-4 border-emerald-500 shadow-lg flex flex-col md:flex-row items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-wider leading-tight">
            <span className="md:hidden">Safe</span>
            <span className="hidden md:inline">Safe Zones</span>
          </p>
          <h3 className="text-sm md:text-2xl font-bold text-white leading-tight">{stats.safeZones}</h3>
        </div>
        <div className="hidden md:block p-3 bg-slate-700/50 rounded-full text-emerald-400">
          <CheckCircle className="w-6 h-6" />
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-slate-800 rounded-md md:rounded-lg p-1.5 md:p-4 border-t-2 md:border-t-0 md:border-l-4 border-amber-500 shadow-lg flex flex-col md:flex-row items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-wider leading-tight">
            <span className="md:hidden">Warn</span>
            <span className="hidden md:inline">Warnings</span>
          </p>
          <h3 className="text-sm md:text-2xl font-bold text-white leading-tight">{stats.warnings}</h3>
        </div>
        <div className="hidden md:block p-3 bg-slate-700/50 rounded-full text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* Critical Danger */}
      <div className="bg-slate-800 rounded-md md:rounded-lg p-1.5 md:p-4 border-t-2 md:border-t-0 md:border-l-4 border-red-500 shadow-lg flex flex-col md:flex-row items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-wider leading-tight">
            <span className="md:hidden">Danger</span>
            <span className="hidden md:inline">Critical Danger</span>
          </p>
          <h3 className="text-sm md:text-2xl font-bold text-white leading-tight">{stats.criticalDanger}</h3>
        </div>
        <div className="hidden md:block p-3 bg-slate-700/50 rounded-full text-red-400 animate-pulse">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;