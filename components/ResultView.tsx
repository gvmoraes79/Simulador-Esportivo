
import React from 'react';
import { SimulationResult } from '../types';
import { ComparisonRadar, ProbabilityPie, ScoreProbabilitiesChart } from './StatsCharts';
import LineupView from './LineupView';
import { RotateCcw, Target, MapPin, Flag, ExternalLink, Lightbulb, TrendingUp, Info } from 'lucide-react';

interface ResultViewProps {
  result: SimulationResult;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, onReset }) => {
  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Placar Principal */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden text-center">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-red-500"></div>
         
         <div className="grid grid-cols-3 items-center gap-4">
            <div className="space-y-2">
               <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{result.homeTeam.name}</h2>
               <div className="text-emerald-500 font-bold text-xs uppercase tracking-widest">{result.homeTeam.winProbability}% Chance</div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
               <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl px-8 py-4 flex items-center gap-6 shadow-inner">
                  <span className="text-7xl font-black text-white tabular-nums">{result.predictedScore.home}</span>
                  <div className="w-[2px] h-12 bg-slate-800"></div>
                  <span className="text-7xl font-black text-white tabular-nums">{result.predictedScore.away}</span>
               </div>
               <span className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">AI Prediction</span>
            </div>

            <div className="space-y-2">
               <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{result.awayTeam.name}</h2>
               <div className="text-red-500 font-bold text-xs uppercase tracking-widest">{result.awayTeam.winProbability}% Chance</div>
            </div>
         </div>
      </div>

      {/* Grid de Análise */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
               <TrendingUp size={18} className="text-emerald-400" /> Tactical Breakdown
            </h3>
            <ComparisonRadar data={result} />
         </div>

         <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
               <Target size={18} className="text-blue-400" /> Score Distribution
            </h3>
            <ScoreProbabilitiesChart data={result} />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-6">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
               <Lightbulb className="text-yellow-500" /> Analista Virtual
            </h3>
            <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
               <p className="text-slate-300 leading-relaxed text-sm italic">
                  "{result.analysisText}"
               </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
               <div className="bg-emerald-500 p-2 rounded-xl text-slate-900 font-black text-xs">TIP</div>
               <div className="text-sm font-bold text-emerald-400">Sugestão: {result.bettingTip}</div>
            </div>
         </div>

         <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8">
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-slate-400">
                  <MapPin size={18} />
                  <span className="text-sm font-medium">{result.weather?.location || "Estádio"}</span>
               </div>
               <div className="flex items-center gap-3 text-slate-400">
                  <Flag size={18} />
                  <span className="text-sm font-medium">Árbitro: {result.referee?.name || "N/A"}</span>
               </div>
               <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
                  <div className="text-4xl font-black text-white">{result.weather?.temp || "22°C"}</div>
                  <div className="text-[10px] text-slate-500 uppercase mt-2">{result.weather?.condition || "Céu Limpo"}</div>
               </div>
            </div>
         </div>
      </div>

      <LineupView lineups={result.lineups} homeTeamName={result.homeTeam.name} awayTeamName={result.awayTeam.name} />

      {/* Fontes */}
      <div className="flex flex-wrap gap-2 pt-10 border-t border-slate-800">
         {result.sources.map((s, i) => (
            <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-full text-[10px] text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-all">
               <ExternalLink size={10} /> {s.title}
            </a>
         ))}
      </div>

      <div className="flex justify-center pb-12">
        <button onClick={onReset} className="bg-slate-800 hover:bg-slate-700 text-white font-black px-10 py-4 rounded-2xl flex items-center gap-3 transition-all">
           <RotateCcw size={20} /> Nova Simulação
        </button>
      </div>
    </div>
  );
};

export default ResultView;
