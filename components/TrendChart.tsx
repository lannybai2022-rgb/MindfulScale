import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { LogEntry } from '../types';

interface TrendChartProps {
  data: LogEntry[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  // Helper to check if date is today
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  // Process data: Filter for today, Sort Oldest -> Newest (Chronological)
  const chartData = data
    .filter(entry => isToday(entry.timestamp))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(entry => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      // Safety: default to 0 if scores is undefined
      calmness: entry.ai_result?.scores?.calmness ?? 0,
      fullDate: new Date(entry.timestamp).toLocaleString()
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-4">
        <span className="text-xs mb-1">暂无今日数据</span>
        <span className="text-[10px] opacity-70">快去记录当下的感受吧</span>
      </div>
    );
  }

  return (
    <div className="h-48 w-full mt-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">今日情绪走势 (Today's Trend)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis 
            domain={[-5, 5]} 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false}
            width={25}
            ticks={[-5, 0, 5]}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
            itemStyle={{ color: '#0d9488', fontWeight: 'bold', fontSize: '12px' }}
          />
          <Line 
            type="monotone" 
            dataKey="calmness" 
            stroke="#11998e" 
            strokeWidth={3} 
            dot={{ r: 3, fill: '#11998e', strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;