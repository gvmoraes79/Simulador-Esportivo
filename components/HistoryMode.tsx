
import React, { useState } from 'react';
import { History, Search, Loader2, TrendingUp, Target, BarChart3, ChevronRight, Calculator, Calendar, Swords } from 'lucide-react';
import { runHistoricalBacktest, runSimulation } from '../services/geminiService';
import { HistoricalTrendResult, RiskLevel, TeamMood, MatchInput } from '../types';

const HistoryMode: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'match'>('match');
  const [loading, setLoading] = useState(false);
  
  // Estados para Tendências
  const [team, setTeam] = useState('');
  const [competition, setCompetition] = useState('Campeonato Brasileiro');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [trendResult, setTrendResult] = useState<HistoricalTrendResult | null>(null);

  // Estados para Jogo Específico (Backtest)
  const [matchInput, setMatchInput] = useState({
    home: '',
    away: '',
    date: '',
    actualScore: ''
  });
  const [matchAnalysis, setMatchAnalysis] = useState<any>(null);

  const handleTrendAnalysis = async () => {
    if (!team) return alert("Informe o time para análise.");
    setLoading(true);
    try {
      const data = await runHistoricalBacktest(team, competition, year);
      setTrendResult(data);
    } catch (e: any) {
      alert(e.message || "Erro ao processar histórico.");
    } finally {
      setLoading(false);
    }
  };

  const handleMatchBacktest = async () => {
    if (!matchInput.home || !matchInput.away || !matchInput.date) {
      return alert("Preencha Mandante, Visitante e Data.");
    }
    setLoading(true);
    try {
      // Usamos a lógica de simulação mas com instrução de retrospectiva
      const simInput: MatchInput = {
        homeTeamName: matchInput.home,
        awayTeamName: matchInput.away,
        date: matchInput.date,
        homeMood: TeamMood.REGULAR,
        awayMood: TeamMood.REGULAR,
        riskLevel: RiskLevel.MODERATE,
        observations: `Este é um BACKTEST. O placar real foi ${matchInput.actualScore || 'desconhecido'}. Analise por que este resultado ocorreu.`
      };
      const data = await runSimulation(simInput);
      setMatchAnalysis(data);
    } catch (e: any) {
      alert("Erro ao analisar jogo passado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       {/* Seletor de Modo */}
       <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit mx-auto shadow-xl">
          <button 
            onClick={() => setActiveTab('match')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'match' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Calculator size={14} /> Analisar Jogo Passado
          </button>
          <button 
            onClick={() => setActiveTab('trends')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'trends' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <TrendingUp size={14} /> Tendências de Equipe
          </button>
       </div>

       {activeTab === 'match' ? (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Swords size={120} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mandante</label>
                    <input type="text" placeholder="Ex: Santos" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-white" value={matchInput.home} onChange={e => setMatchInput({...matchInput, home: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visitante</label>
                    <input type="text" placeholder="Ex: Grêmio" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-white" value={matchInput.away} onChange={e => setMatchInput({...matchInput, away: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
                    <input type="date" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-white font-mono" value={matchInput.date} onChange={e => setMatchInput({...matchInput, date: e.target.value})} />
                  </div>
                  <button onClick={handleMatchBacktest} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all h-[58px]">
                     {loading ? <Loader2 className="animate-spin" /> : <><Calculator size={20} /> Rodar Backtest</>}
                  </button>
               </div>
            </div>

            {matchAnalysis && (
               <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 animate-fade-in-up">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                     <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Retrospectiva de Confronto</h3>
                        <p className="text-slate-500 text-xs font-mono">{matchInput.date}</p>
                     </div>
                     <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800">
                        <span className="text-emerald-500 font-black text-xl">{matchAnalysis.predictedScore.home} - {matchAnalysis.predictedScore.away}</span>
                        <div className="text-[8px] text-slate-600 font-bold uppercase text-center mt-1">Predição IA</div>
                     </div>
                  </div>
                  
                  <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 border-l-4 border-l-emerald-500">
                     <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BarChart3 size={14} /> Análise do Desfecho
                     </h4>
                     <p className="text-slate-300 text-sm leading-relaxed italic italic">"{matchAnalysis.analysisText}"</p>
                  </div>
               </div>
            )}
          </div>
       ) : (
          /* Aba de Tendências (Antigo modo histórico) */
          <div className="space-y-8">
             <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <History size={120} />
                </div>
                <div className="space-y-2 relative z-10">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Equipe Alvo</label>
                  <input type="text" placeholder="Ex: Palmeiras" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-white" value={team} onChange={e => setTeam(e.target.value)} />
                </div>
                <div className="space-y-2 relative z-10">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Competição</label>
                  <input type="text" placeholder="Ex: Premier League" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-white" value={competition} onChange={e => setCompetition(e.target.value)} />
                </div>
                <div className="space-y-2 relative z-10">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Ano/Temporada</label>
                  <input type="text" placeholder="2023" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none text-white" value={year} onChange={e => setYear(e.target.value)} />
                </div>
                <button onClick={handleTrendAnalysis} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 relative z-10 h-[58px]">
                   {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Analisar Tendências</>}
                </button>
             </div>

             {trendResult && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center space-y-4">
                      <div className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Aproveitamento</div>
                      <div className="text-4xl font-black text-white">{trendResult.winRate}%</div>
                      <div className="text-[8px] text-slate-600 font-bold uppercase">Taxa de Vitórias em {year}</div>
                   </div>
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center space-y-4">
                      <div className="text-blue-500 font-black text-[10px] uppercase tracking-widest">Gols / Jogo</div>
                      <div className="text-4xl font-black text-white">{trendResult.avgGoalsScored}</div>
                      <div className="text-[8px] text-slate-600 font-bold uppercase">Média de Gols Pró</div>
                   </div>
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center space-y-4 border-l-4 border-l-emerald-500">
                      <div className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Estratégia Ideal</div>
                      <div className="text-2xl font-black text-emerald-400 italic uppercase">{trendResult.bestStrategy}</div>
                      <div className="text-[8px] text-slate-600 font-bold uppercase">Consistência: {trendResult.consistencyScore}/100</div>
                   </div>
                </div>
             )}
          </div>
       )}
    </div>
  );
};

export default HistoryMode;
