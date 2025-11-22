import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceArea, Cell } from 'recharts';
import { LogEntry } from '../types';

interface AttentionMapProps {
  data: LogEntry[];
}

const AttentionMap: React.FC<AttentionMapProps> = ({ data }) => {
  // Helper to check if date is today
  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Filter data for today only
  const todayData = data.filter(entry => isToday(entry.timestamp));

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg max-w-xs">
          <p className="text-xs text-slate-400 font-medium">{data.formattedTime}</p>
          <p className="text-sm font-bold text-slate-800 my-1">{data.target === 'Internal' ? '🟣 Internal' : '🟠 External'}</p>
          <p className="text-xs text-slate-600 italic">{data.summary}</p>
        </div>
      );
    }
    return null;
  };

  if (todayData.length === 0) {
    return (
      <div className="w-full h-80 relative bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center justify-center">
        <span className="text-xs text-slate-400 mb-1">今日暂无数据</span>
        <span className="text-[10px] text-slate-300">快去记录当下的感受吧</span>
      </div>
    );
  }

  const chartData = todayData
    .reverse()
    .map(entry => {
        // Safety check: Provide default object if focus_analysis is missing
        const focus = entry.ai_result?.focus_analysis || { 
            time_orientation: 'Present', 
            focus_target: 'Internal' 
        };
        
        // Map orientation to Y axis
        let yVal = 2; // Present
        if (focus.time_orientation === 'Past') yVal = 3;
        if (focus.time_orientation === 'Future') yVal = 1;
        
        return {
            x: new Date(entry.timestamp).getTime(),
            y: yVal,
            z: 100, // Size
            target: focus.focus_target || 'Internal',
            summary: entry.ai_result?.summary || '无摘要',
            formattedTime: new Date(entry.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
        };
    });

  const domainX = chartData.length > 0 
    ? [Math.min(...chartData.map(d => d.x)) - 3600000, Math.max(...chartData.map(d => d.x)) + 3600000]
    : [new Date().getTime(), new Date().getTime() + 86400000];

  return (
    <div className="w-full h-80 relative bg-white rounded-xl border border-slate-200 overflow-hidden">
       
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <XAxis 
            dataKey="x" 
            type="number" 
            domain={domainX} 
            tickFormatter={(unixTime) => new Date(unixTime).getHours() + ':' + new Date(unixTime).getMinutes().toString().padStart(2, '0')} 
            hide
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            domain={[0.5, 3.5]} 
            hide
          />
          <ZAxis type="number" dataKey="z" range={[100, 400]} />
          
          {/* Background Zones */}
          <ReferenceArea y1={2.5} y2={3.5} fill="#F3E5F5" fillOpacity={0.5} />
          <ReferenceArea y1={1.5} y2={2.5} fill="#F2F4F6" fillOpacity={0.5} />
          <ReferenceArea y1={0.5} y2={1.5} fill="#E1F5FE" fillOpacity={0.5} />
          
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          
          <Scatter data={chartData} name="Focus">
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.target === 'External' ? '#FF9800' : '#9C27B0'} 
                fillOpacity={0.8}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Overlay Labels */}
      <div className="absolute left-4 top-8 text-slate-400 font-bold text-sm pointer-events-none select-none">Past</div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none select-none">Present</div>
      <div className="absolute left-4 bottom-8 text-slate-400 font-bold text-sm pointer-events-none select-none">Future</div>

      <div className="absolute bottom-2 right-4 flex gap-3">
         <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-[#9C27B0] opacity-80"></div> Internal
         </div>
         <div className="flex items-center gap-1 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-full bg-[#FF9800] opacity-80"></div> External
         </div>
      </div>
    </div>
  );
};

export default AttentionMap;