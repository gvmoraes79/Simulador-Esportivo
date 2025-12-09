
import React, { useState } from 'react';
import { runHistoricalBacktest } from '../services/geminiService';
import { HistoricalDrawStats, RiskLevel } from '../types';
import { History, Play, Loader2, Trophy, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

const HistoryMode: React.FC = () => {
  const [startDraw, setStartDraw] = useState<string>('');
  const [endDraw, setEndDraw] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState<HistoricalDrawStats[]>([]);

  const handleStartBacktest = async () => {
    const start = parseInt(startDraw);
    const end = parseInt(endDraw);

    if (isNaN(start) || isNaN(end) || start > end) {
      alert("Intervalo de concursos inválido.");
      return;
    }
    
    // Limite de segurança para não estourar a API
    if (end - start > 10) {
        if(!confirm("Você selecionou mais de 10 concursos. Isso pode demorar vários minutos. Deseja continuar?")) return;
    }

    setLoading(true);
    setResults([]);
    try {
      const data = await runHistoricalBacktest(start, end, (msg) => {
         setProgressMsg(msg);
      });
      setResults(data);
    } catch (e) {
      console.error(e);
      alert("Erro ao executar backtest.");
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const getScoreColor = (score: number, total: number) => {
     const pct = score / total;
     if (pct >= 0.9) return "text-emerald-400 font-black"; // 13-14 pts
     if (pct >= 0.7) return "text-blue-400 font-bold";    // 10-12 pts
     if (pct >= 0.5) return "text-yellow-500 font-medium"; // 7-9 pts
     return "text-slate-500";
  };

  const getBestStrategyBadge = (stats: HistoricalDrawStats) => {
     const mapColors: Record<RiskLevel, string> = {
        [RiskLevel.CONSERVATIVE]: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
        [RiskLevel.CALCULATED]: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
        [RiskLevel.MODERATE]: "bg-amber-500/20 text-amber-400 border-amber-500/50",
        [RiskLevel.AGGRESSIVE]: "bg-orange-500/20 text-orange-400 border-orange-500/50",
        [RiskLevel.BOLD]: "bg-purple-500/20 text-purple-400 border-purple-500/50",
     };
     
     return (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${mapColors[stats.bestStrategy]}`}>
           {stats.bestStrategy}
        </span>
     );
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
             <div className="bg-purple-600 p-2 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                <History className="text-white" size={24} />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Backtest Histórico</h2>
                <p className="text-slate-400 text-xs font-mono">Simule concursos passados e descubra a melhor estratégia.</p>
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-950 p-6 rounded-2xl border border-slate-800">
             <div className="w-full md:w-auto">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Concurso Inicial</label>
                <input 
                  type="number" 
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-full md:w-32 focus:ring-2 focus:ring-purple-500 outline-none text-center font-mono font-bold"
                  placeholder="1150"
                  value={startDraw}
                  onChange={e => setStartDraw(e.target.value)}
                />
             </div>
             <div className="hidden md:block pb-4 text-slate-600 font-black">ATÉ</div>
             <div className="w-full md:w-auto">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Concurso Final</label>
                <input 
                  type="number" 
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white w-full md:w-32 focus:ring-2 focus:ring-purple-500 outline-none text-center font-mono font-bold"
                  placeholder="1155"
                  value={endDraw}
                  onChange={e => setEndDraw(e.target.value)}
                />
             </div>
             
             <button
               onClick={handleStartBacktest}
               disabled={loading || !startDraw || !endDraw}
               className="w-full md:flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {loading ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                {loading ? "Processando..." : "Iniciar Análise"}
             </button>
          </div>

          {loading && (
             <div className="mt-6 bg-slate-950 rounded-xl p-4 border border-purple-500/30 flex items-center gap-4 animate-pulse">
                <Loader2 className="text-purple-500 animate-spin" size={24} />
                <div className="text-purple-300 font-mono text-sm">{progressMsg}</div>
             </div>
          )}
       </div>

       {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden animate-fade-in-up">
             <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="bg-slate-800 text-purple-400 p-2 rounded-lg"><TrendingUp size={20}/></div>
                   <div>
                      <h4 className="text-slate-800 font-black uppercase tracking-tight text-lg">Matriz de Performance</h4>
                      <p className="text-slate-500 text-xs font-bold">Resultados consolidados por perfil de risco</p>
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                   <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider text-center">
                         <th className="py-3 px-4 text-left">Concurso</th>
                         <th className="py-3 px-4 text-left">Data</th>
                         <th className="py-3 px-2 w-24 bg-emerald-50 text-emerald-800 border-l border-emerald-100">Conservador</th>
                         <th className="py-3 px-2 w-24 bg-cyan-50 text-cyan-800 border-l border-cyan-100">Calculado</th>
                         <th className="py-3 px-2 w-24 bg-amber-50 text-amber-800 border-l border-amber-100">Moderado</th>
                         <th className="py-3 px-2 w-24 bg-orange-50 text-orange-800 border-l border-orange-100">Agressivo</th>
                         <th className="py-3 px-2 w-24 bg-purple-50 text-purple-800 border-l border-purple-100">Ousado</th>
                         <th className="py-3 px-4 text-right">Melhor Estratégia</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {results.map((row, idx) => (
                         <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                               <div className="bg-slate-200 p-1 rounded text-slate-500"><Trophy size={14}/></div>
                               #{row.concurso}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                               <div className="flex items-center gap-1"><Calendar size={12}/> {row.date}</div>
                            </td>
                            
                            {/* Pontuações */}
                            <td className="text-center border-l border-slate-100 font-mono text-base bg-emerald-50/30">
                               <span className={getScoreColor(row.scores[RiskLevel.CONSERVATIVE], row.totalGames)}>
                                  {row.scores[RiskLevel.CONSERVATIVE]}
                               </span>
                               <span className="text-[10px] text-slate-400">/{row.totalGames}</span>
                            </td>
                            <td className="text-center border-l border-slate-100 font-mono text-base bg-cyan-50/30">
                               <span className={getScoreColor(row.scores[RiskLevel.CALCULATED], row.totalGames)}>
                                  {row.scores[RiskLevel.CALCULATED]}
                               </span>
                               <span className="text-[10px] text-slate-400">/{row.totalGames}</span>
                            </td>
                            <td className="text-center border-l border-slate-100 font-mono text-base bg-amber-50/30">
                               <span className={getScoreColor(row.scores[RiskLevel.MODERATE], row.totalGames)}>
                                  {row.scores[RiskLevel.MODERATE]}
                               </span>
                               <span className="text-[10px] text-slate-400">/{row.totalGames}</span>
                            </td>
                            <td className="text-center border-l border-slate-100 font-mono text-base bg-orange-50/30">
                               <span className={getScoreColor(row.scores[RiskLevel.AGGRESSIVE], row.totalGames)}>
                                  {row.scores[RiskLevel.AGGRESSIVE]}
                               </span>
                               <span className="text-[10px] text-slate-400">/{row.totalGames}</span>
                            </td>
                            <td className="text-center border-l border-slate-100 font-mono text-base bg-purple-50/30">
                               <span className={getScoreColor(row.scores[RiskLevel.BOLD], row.totalGames)}>
                                  {row.scores[RiskLevel.BOLD]}
                               </span>
                               <span className="text-[10px] text-slate-400">/{row.totalGames}</span>
                            </td>
                            
                            <td className="px-4 py-3 text-right">
                               {getBestStrategyBadge(row)}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       )}
       
       <div className="text-center text-slate-500 text-xs mt-8 pb-8">
          <p>
             <AlertCircle size={12} className="inline mr-1" />
             O processo de backtest é intensivo e pode levar cerca de 30-60 segundos por concurso analisado devido à profundidade da simulação de IA.
          </p>
       </div>
    </div>
  );
};

export default HistoryMode;
