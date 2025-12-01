import React from 'react';
import { Lineups } from '../types';
import { Users } from 'lucide-react';

interface LineupViewProps {
  lineups: Lineups;
  homeTeamName: string;
  awayTeamName: string;
}

const LineupView: React.FC<LineupViewProps> = ({ lineups, homeTeamName, awayTeamName }) => {
  if (!lineups || !lineups.home || !lineups.away) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-500 p-1.5 rounded text-slate-900">
           <Users size={16} />
        </div>
        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Escalações Prováveis</h3>
      </div>
      
      {/* Tactic Board Container */}
      <div className="bg-emerald-800 rounded-xl p-1 border-4 border-slate-800 shadow-xl overflow-hidden relative">
        {/* Pitch Texture */}
        <div className="bg-emerald-700/50 absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.1)_50%,transparent_50%)] bg-[length:100%_40px]"></div>
        
        {/* Center Line (Decorative) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/30 hidden md:block transform -translate-x-1/2"></div>
        <div className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full border-2 border-white/30 hidden md:block transform -translate-x-1/2 -translate-y-1/2"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative z-10">
          {/* Home Team Side */}
          <div className="p-6 md:pr-12">
            <h4 className="text-white font-black text-lg mb-4 text-center uppercase drop-shadow-md bg-black/20 py-1 rounded">{homeTeamName}</h4>
            <div className="space-y-2">
              {lineups.home.map((player, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-white text-emerald-900 font-bold text-xs flex items-center justify-center shadow-md border border-slate-300">
                    {idx + 1}
                  </div>
                  <div className="text-white font-medium text-sm drop-shadow-md bg-emerald-900/40 px-2 py-0.5 rounded backdrop-blur-sm w-full">
                    {player}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Away Team Side */}
          <div className="p-6 md:pl-12 relative">
            {/* Divider for mobile */}
             <div className="absolute top-0 left-4 right-4 h-[1px] bg-white/20 md:hidden"></div>

            <h4 className="text-white font-black text-lg mb-4 text-center uppercase drop-shadow-md bg-black/20 py-1 rounded">{awayTeamName}</h4>
            <div className="space-y-2">
              {lineups.away.map((player, idx) => (
                <div key={idx} className="flex items-center gap-3 flex-row-reverse md:flex-row group">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-md border border-slate-600">
                    {idx + 1}
                  </div>
                  <div className="text-white font-medium text-sm drop-shadow-md bg-emerald-900/40 px-2 py-0.5 rounded backdrop-blur-sm w-full text-right md:text-left">
                    {player}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-right text-[10px] text-slate-500 font-mono">
        * Dados atualizados via Google Search Grounding
      </div>
    </div>
  );
};

export default LineupView;