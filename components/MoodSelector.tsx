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
    <div className="flex flex-col gap-2">
      <label className={`text-sm font-semibold ${colorClass}`}>{label}</label>
      <div className="flex gap-2">
        {Object.values(TeamMood).map((mood) => {
          let icon = '';
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
                flex-1 py-2 px-3 rounded-lg text-sm border transition-all duration-200
                flex flex-col items-center justify-center gap-1
                ${isSelected 
                  ? 'bg-slate-700 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}
              `}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs">{mood}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodSelector;