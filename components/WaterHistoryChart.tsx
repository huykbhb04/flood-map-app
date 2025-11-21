import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HistoricalDataPoint } from '../types';

interface Props {
  data: HistoricalDataPoint[];
  dangerThreshold: number;
  warningThreshold: number;
}

export const WaterHistoryChart: React.FC<Props> = ({ data, dangerThreshold, warningThreshold }) => {
  return (
    <div className="h-64 w-full bg-white rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-4">Water Level Trend (Last Hour)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12, fill: '#9ca3af' }} 
            axisLine={false} 
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#9ca3af' }} 
            axisLine={false} 
            tickLine={false}
            unit="cm"
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#3b82f6' }}
          />
          <ReferenceLine y={warningThreshold} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
          <ReferenceLine y={dangerThreshold} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Danger', fill: '#ef4444', fontSize: 10 }} />
          <Line 
            type="monotone" 
            dataKey="level" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
