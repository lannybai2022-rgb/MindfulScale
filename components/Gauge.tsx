import React from 'react';

interface GaugeProps {
  label: string;
  score: number;
  icon: React.ReactNode;
  theme: 'peace' | 'awareness' | 'energy';
}

const Gauge: React.FC<GaugeProps> = ({ label, score, icon, theme }) => {
  const percent = (score + 5) * 10;
  
  // Define colors based on theme
  const colors = {
    peace: {
        bg: "bg-gradient-to-t from-[#11998e] to-[#38ef7d]",
        border: "border-[#11998e]",
        text: "text-[#11998e]"
    },
    awareness: {
        bg: "bg-gradient-to-t from-[#4A00E0] to-[#8E2DE2]",
        border: "border-[#4A00E0]",
        text: "text-[#4A00E0]"
    },
    energy: {
        bg: "bg-gradient-to-t from-[#e67e22] to-[#f5af19]",
        border: "border-[#e67e22]",
        text: "text-[#e67e22]"
    }
  };

  const currentTheme = colors[theme];

  return (
    <div className="flex flex-col items-center w-20">
      <div className="relative h-40 w-11 bg-slate-100 rounded-full mt-1 shadow-inner overflow-hidden border border-slate-200">
        {/* Tick Marks */}
        <div className="absolute top-1 left-0 w-full text-center text-[10px] font-bold text-gray-300 z-10">+5</div>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full text-center text-[10px] font-bold text-gray-300 z-10">0</div>
        <div className="absolute bottom-1 left-0 w-full text-center text-[10px] font-bold text-gray-300 z-10">-5</div>

        {/* Fill Bar */}
        <div 
            className={`absolute bottom-0 w-full rounded-b-full transition-all duration-1000 ease-out ${currentTheme.bg}`}
            style={{ height: `${percent}%`, minHeight: '6px' }}
        />

        {/* Score Bubble */}
        <div 
            className={`absolute left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-lg shadow-md border-2 ${currentTheme.border} ${currentTheme.text} font-extrabold text-xs transition-all duration-1000 z-20`}
            style={{ bottom: `calc(${percent}% - 12px)` }}
        >
            {score}
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <div className="text-xl mb-1">{icon}</div>
        <div className="text-xs font-semibold text-slate-600">{label}</div>
      </div>
    </div>
  );
};

export default Gauge;
