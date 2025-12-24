
import React from 'react';
import { TeamMood } from '../types';

interface MoodSelectorProps {
  label: string;
  value: TeamMood;
  onChange: (mood: TeamMood) => void;
  colorClass: string;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ label, value, onChange, colorClass }) => {
  const moods = [
    { type: TeamMood.EXCITED, icon: '🔥', label: 'Em Alta' },
    { type: TeamMood.REGULAR, icon: '😐', label: 'Regular' },
    { type: TeamMood.DEMOTIVATED, icon: '🌧️', label: 'Em Baixa' }
  ];

  return (
    <div className="space-y-3">
      <label className={`text-[10px] font-bold uppercase tracking-widest ${colorClass} ml-1`}>{label}</label>
      <div className="flex gap-2">
        {moods.map(m => (
          <button
            key={m.type}
            type="button"
            onClick={() => onChange(m.type)}
            className={`flex-1 flex flex-col items-center justify-center py-4 rounded-2xl border transition-all ${value === m.type ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-950 border-slate-800 opacity-40 hover:opacity-100'}`}
          >
            <span className="text-2xl mb-1">{m.icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoodSelector;
