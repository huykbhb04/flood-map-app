import React from 'react';
import { Activity, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { DashboardStats as StatsType } from '../types';

interface Props {
  stats: StatsType;
}

const DashboardStats: React.FC<Props> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Active Nodes */}
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Nodes</p>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.activeNodes}</h3>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-full text-blue-400">
          <Activity size={24} />
        </div>
      </div>

      {/* Safe Zones */}
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-emerald-500 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Safe Zones</p>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.safeZones}</h3>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-full text-emerald-400">
          <CheckCircle size={24} />
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-amber-500 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Warnings</p>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.warnings}</h3>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-full text-amber-400">
          <AlertTriangle size={24} />
        </div>
      </div>

      {/* Critical Danger */}
      <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-red-500 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Critical Danger</p>
          <h3 className="text-2xl font-bold text-white mt-1">{stats.criticalDanger}</h3>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-full text-red-400 animate-pulse">
          <TrendingUp size={24} />
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;