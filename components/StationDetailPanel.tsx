
import React, { useState, useEffect } from 'react';
import { Station, Status } from '../types';
import { 
  X, 
  Droplets, 
  AlertOctagon, 
  BrainCircuit
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzeFloodRisk } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Props {
  station: Station;
  onClose: () => void;
}

const StationDetailPanel: React.FC<Props> = ({ station, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  // Reset local state when switching stations (check by ID)
  useEffect(() => {
    setAnalysisResult(null);
  }, [station.id]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeFloodRisk(station);
    setAnalysisResult(result);
    setAnalyzing(false);
  };

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

  return (
    <div className="h-full flex flex-col bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-start bg-slate-900/50">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Water Level */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 text-center flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5" style={{ height: `${Math.min(100, station.currentLevel)}%`, bottom: 0, top: 'auto', transition: 'height 0.5s' }}></div>
            <div className="text-slate-400 text-xs mb-1 flex items-center justify-center gap-1 z-10">
               <Droplets size={12} /> Water Level
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(station.status)} z-10`}>
              {station.currentLevel} <span className="text-sm text-slate-500">cm</span>
            </div>
          </div>

          {/* Threshold Display (Read Only) */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 text-center flex flex-col justify-center relative">
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

        {/* Chart */}
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
          <div className="h-48 w-full bg-slate-900/50 rounded-lg border border-slate-700 p-2">
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

        {/* AI Analyst */}
        <div className="border-t border-slate-700 pt-4">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2 text-purple-400">
               <BrainCircuit size={20} />
               <h3 className="font-bold text-white">AI Risk Analyst</h3>
             </div>
             <button 
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white text-xs px-3 py-1.5 rounded transition-colors font-medium"
             >
               {analyzing ? 'Analyzing...' : 'Run Analysis'}
             </button>
           </div>

           <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 min-h-[150px] text-sm text-slate-300">
             {analysisResult ? (
               <div className="prose prose-invert prose-sm max-w-none">
                 <ReactMarkdown>{analysisResult}</ReactMarkdown>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-500 py-4">
                 <p>Click "Run Analysis" to generate a real-time risk assessment report using Gemini AI.</p>
               </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default StationDetailPanel;
