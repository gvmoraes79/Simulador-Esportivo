
import React from 'react';
import { Lineups } from '../types';
import { Users } from 'lucide-react';

const LineupView: React.FC<{ lineups: Lineups, homeTeamName: string, awayTeamName: string }> = ({ lineups, homeTeamName, awayTeamName }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-3">
        <Users className="text-emerald-500" /> Probable Lineups
      </h3>
      
      <div className="bg-emerald-900/30 rounded-[2rem] border-4 border-slate-800 p-8 grid grid-cols-1 md:grid-cols-2 gap-10 relative overflow-hidden">
         <div className="absolute top-0 left-1/2 w-[2px] h-full bg-slate-800 hidden md:block"></div>
         
         <div className="space-y-4">
            <h4 className="text-emerald-400 font-black text-center mb-6 uppercase tracking-tighter italic">{homeTeamName}</h4>
            {lineups.home.map((p, i) => (
               <div key={i} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-emerald-400">{i+1}</div>
                  <span className="text-sm font-medium text-slate-300">{p}</span>
               </div>
            ))}
         </div>

         <div className="space-y-4">
            <h4 className="text-red-400 font-black text-center mb-6 uppercase tracking-tighter italic">{awayTeamName}</h4>
            {lineups.away.map((p, i) => (
               <div key={i} className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-red-400">{i+1}</div>
                  <span className="text-sm font-medium text-slate-300">{p}</span>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default LineupView;
