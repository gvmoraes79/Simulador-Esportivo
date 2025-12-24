
import React from 'react';
import { RiskLevel } from '../types';
import { Shield, Target, Zap, TrendingUp, Flame } from 'lucide-react';

const RiskSelector: React.FC<{ value: RiskLevel, onChange: (r: RiskLevel) => void }> = ({ value, onChange }) => {
  const levels = [
    { type: RiskLevel.CONSERVATIVE, label: 'Conservador', icon: Shield, color: 'emerald' },
    { type: RiskLevel.CALCULATED, label: 'Calculado', icon: Target, color: 'blue' },
    { type: RiskLevel.MODERATE, label: 'Moderado', icon: TrendingUp, color: 'amber' },
    { type: RiskLevel.AGGRESSIVE, label: 'Agressivo', icon: Zap, color: 'orange' },
    { type: RiskLevel.BOLD, label: 'Ousado', icon: Flame, color: 'purple' }
  ];

  return (
    <div className="space-y-3">
       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Estratégia de Risco</label>
       <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {levels.map(l => (
             <button
               key={l.type}
               type="button"
               onClick={() => onChange(l.type)}
               className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${value === l.type ? `bg-slate-800 border-${l.color}-500 shadow-lg` : 'bg-slate-950 border-slate-800 opacity-40 hover:opacity-100'}`}
             >
                <l.icon size={20} className={value === l.type ? `text-${l.color}-400` : 'text-slate-500'} />
                <span className="text-[8px] font-bold uppercase mt-2 tracking-tighter text-slate-400">{l.label}</span>
             </button>
          ))}
       </div>
    </div>
  );
};

export default RiskSelector;
