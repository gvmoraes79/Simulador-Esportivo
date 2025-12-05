import React from 'react';
import { TeamMood } from '../types';

interface MoodSelectorProps {
  label: string;
  value: TeamMood;
  onChange: (mood: TeamMood) => void;
  colorClass: string;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ label, value, onChange, colorClass }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <label className={`text-xs font-bold uppercase tracking-wider ${colorClass} text-center md:text-left`}>
        {label}
      </label>
      
      {/* Grid Layout para distribuição perfeita em 3 colunas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
        {Object.values(TeamMood).map((mood) => {
          let icon = '';
          // Ícones maiores para melhor visualização
          switch (mood) {
            case TeamMood.EXCITED: icon = '🔥'; break;
            case TeamMood.REGULAR: icon = '😐'; break;
            case TeamMood.DEMOTIVATED: icon = '🌧️'; break;
          }
          
          const isSelected = value === mood;
          
          return (
            <button
              key={mood}
              type="button"
              onClick={() => onChange(mood)}
              className={`
                group relative flex flex-col items-center justify-center gap-2 py-3 px-1 rounded-xl border transition-all duration-300
                ${isSelected 
                  ? 'bg-slate-800 border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50 transform scale-[1.02]' 
                  : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'}
              `}
            >
              <span className={`text-2xl transition-transform duration-300 ${isSelected ? 'scale-110' : 'group-hover:scale-110 grayscale group-hover:grayscale-0'}`}>
                {icon}
              </span>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide truncate w-full text-center ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {mood}
              </span>
              
              {/* Indicador de seleção ativo (ponto brilhante) */}
              {isSelected && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_currentColor]"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodSelector;