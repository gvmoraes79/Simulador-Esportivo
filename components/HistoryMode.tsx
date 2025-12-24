
import React, { useState } from 'react';
import { History, Search, Loader2, TrendingUp, ShieldAlert, Zap, Target, BarChart3, ChevronRight } from 'lucide-react';
import { runHistoricalBacktest } from '../services/geminiService';
import { HistoricalTrendResult, RiskLevel } from '../types';

const HistoryMode: React.FC = () => {
  const [team, setTeam] = useState('');
  const [competition, setCompetition] = useState('Campeonato Brasileiro');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HistoricalTrendResult | null>(null);

  const handleAnalyze = async () => {
    if (!team) return alert("Informe o time para análise.");
    setLoading(true);
    try {
      const data = await runHistoricalBacktest(team, competition, year);
      setResult(data);
    } catch (e: any) {
      alert(e.message || "Erro ao processar histórico.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.CONSERVATIVE: return 'text-emerald-500';
      case RiskLevel.BOLD: return 'text-purple-500';
      case RiskLevel.AGGRESSIVE: return 'text-orange-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <History size={120} />
          </div>
          
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Equipe Alvo</label>
            <input type="text" placeholder="Ex: Palmeiras" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none transition-all text-white" value={team} onChange={e => setTeam(e.target.value)} />
          </div>
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Competição</label>
            <input type="text" placeholder="Ex: Premier League" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none transition-all text-white" value={competition} onChange={e => setCompetition(e.target.value)} />
          </div>
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Ano/Temporada</label>
            <input type="text" placeholder="2023" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none transition-all text-white" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <button onClick={handleAnalyze} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 relative z-10">
             {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Analisar Tendências</>}
          </button>
       </div>

       {result ? (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-4">
                   <div className="flex items-center gap-3 text-emerald-500 font-black text-xs uppercase tracking-widest">
                      <BarChart3 size={16} /> Taxa de Eficiência
                   </div>
                   <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                         <div className="text-xl font-black text-white">{result.winRate}%</div>
                         <div className="text-[8px] text-slate-500 font-bold uppercase">Vitórias</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                         <div className="text-xl font-black text-white">{result.drawRate}%</div>
                         <div className="text-[8px] text-slate-500 font-bold uppercase">Empates</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                         <div className="text-xl font-black text-white">{result.lossRate}%</div>
                         <div className="text-[8px] text-slate-500 font-bold uppercase">Derrotas</div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] space-y-4">
                   <div className="flex items-center gap-3 text-blue-500 font-black text-xs uppercase tracking-widest">
                      <Target size={16} /> Média de Gols
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                         <div className="text-3xl font-black text-white">{result.avgGoalsScored}</div>
                         <div className="text-[9px] text-slate-500 font-bold uppercase">Pró / Jogo</div>
                      </div>
                      <div className="text-center">
                         <div className="text-3xl font-black text-white">{result.avgGoalsConceded}</div>
                         <div className="text-[9px] text-slate-500 font-bold uppercase">Contra / Jogo</div>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center space-y-2 border-l-4 border-l-emerald-500">
                   <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estratégia Recomendada</div>
                   <div className={`text-2xl font-black uppercase italic ${getRiskColor(result.bestStrategy)}`}>
                      {result.bestStrategy}
                   </div>
                   <div className="text-[10px] text-slate-600 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">Score Consistência: {result.consistencyScore}/100</div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                   <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-400" /> Padrão Tático Identificado
                   </h3>
                   <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                      <p className="text-slate-400 text-sm leading-relaxed italic">
                         "{result.tacticalPattern}"
                      </p>
                   </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                   <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      <Zap size={18} className="text-amber-400" /> Amostragem Recente ({result.period})
                   </h3>
                   <div className="space-y-2">
                      {result.recentMatches.map((m, i) => (
                         <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                  m.result === 'W' ? 'bg-emerald-500/20 text-emerald-500' :
                                  m.result === 'L' ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-400'
                               }`}>
                                  {m.result}
                               </div>
                               <span className="text-sm font-bold text-slate-300">{result.team} <span className="text-slate-600 px-1">{m.score}</span> {m.opponent}</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-700 uppercase tracking-tighter">{m.competition}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
       ) : (
          <div className="bg-slate-900/50 border border-slate-800 p-20 rounded-[3rem] text-center space-y-6">
             <div className="bg-slate-950 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto border border-slate-800 shadow-2xl relative">
                <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full"></div>
                <TrendingUp className="text-emerald-500 relative z-10" size={40} />
             </div>
             <div className="space-y-2">
               <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Motor de Tendências IA</h2>
               <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Busque o desempenho histórico de qualquer clube para validar suas estratégias de aposta antes do próximo kickoff.
               </p>
             </div>
             <div className="flex justify-center gap-4 pt-4">
                <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Google Search Grounding</div>
                <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Backtest v2.0</div>
             </div>
          </div>
       )}
    </div>
  );
};

export default HistoryMode;
