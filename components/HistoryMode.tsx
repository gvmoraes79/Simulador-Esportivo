
import React, { useState } from 'react';
import { History, Search, Loader2, TrendingUp, BarChart3, Calculator, Swords } from 'lucide-react';
import { runHistoricalBacktest, runSimulation } from '../services/geminiService';
import { HistoricalTrendResult, RiskLevel, TeamMood, MatchInput } from '../types';

const HistoryMode: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'trends' | 'match'>('match');
  const [loading, setLoading] = useState(false);
  
  // Analisar Jogo Específico
  const [matchInput, setMatchInput] = useState({ home: '', away: '', date: '', score: '' });
  const [matchResult, setMatchResult] = useState<any>(null);

  // Analisar Tendências
  const [trendInput, setTrendInput] = useState({ team: '', competition: 'Campeonato Brasileiro', year: '2023' });
  const [trendResult, setTrendResult] = useState<HistoricalTrendResult | null>(null);

  const handleMatchAnalysis = async () => {
    if (!matchInput.home || !matchInput.away || !matchInput.date) return alert("Preencha os campos obrigatórios.");
    setLoading(true);
    try {
      const input: MatchInput = {
        homeTeamName: matchInput.home,
        awayTeamName: matchInput.away,
        date: matchInput.date,
        homeMood: TeamMood.REGULAR,
        awayMood: TeamMood.REGULAR,
        riskLevel: RiskLevel.MODERATE,
        observations: `Análise retrospectiva. Placar real: ${matchInput.score || 'não informado'}.`
      };
      const data = await runSimulation(input);
      setMatchResult(data);
    } catch (e) {
      alert("Erro na análise do jogo.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrendAnalysis = async () => {
    if (!trendInput.team) return alert("Informe o time.");
    setLoading(true);
    try {
      const data = await runHistoricalBacktest(trendInput.team, trendInput.competition, trendInput.year);
      setTrendResult(data);
    } catch (e) {
      alert("Erro na análise de tendências.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit mx-auto shadow-xl">
        <button onClick={() => setActiveTab('match')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'match' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
          <Calculator size={14} /> Jogo Específico
        </button>
        <button onClick={() => setActiveTab('trends')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'trends' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
          <TrendingUp size={14} /> Tendências de Equipe
        </button>
      </div>

      {activeTab === 'match' ? (
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mandante</label>
                <input type="text" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={matchInput.home} onChange={e => setMatchInput({...matchInput, home: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visitante</label>
                <input type="text" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={matchInput.away} onChange={e => setMatchInput({...matchInput, away: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
                <input type="date" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={matchInput.date} onChange={e => setMatchInput({...matchInput, date: e.target.value})} />
              </div>
              <button onClick={handleMatchAnalysis} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 h-[58px] transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Analisar Jogo</>}
              </button>
            </div>
          </div>

          {matchResult && (
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-6 animate-fade-in-up">
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <h3 className="text-xl font-black text-white uppercase italic">Análise Retrospectiva</h3>
                <div className="bg-emerald-500/20 px-4 py-2 rounded-xl text-emerald-500 font-black">
                  Predição: {matchResult.predictedScore.home} - {matchResult.predictedScore.away}
                </div>
              </div>
              <p className="text-slate-300 italic leading-relaxed">"{matchResult.analysisText}"</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Equipe</label>
              <input type="text" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none" value={trendInput.team} onChange={e => setTrendInput({...trendInput, team: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Competição</label>
              <input type="text" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white" value={trendInput.competition} onChange={e => setTrendInput({...trendInput, competition: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ano</label>
              <input type="text" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white" value={trendInput.year} onChange={e => setTrendInput({...trendInput, year: e.target.value})} />
            </div>
            <button onClick={handleTrendAnalysis} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl h-[58px]">
              {loading ? <Loader2 className="animate-spin" /> : "Analisar Tendências"}
            </button>
          </div>

          {trendResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center">
                <div className="text-emerald-500 font-black text-xs uppercase mb-2">Aproveitamento</div>
                <div className="text-4xl font-black text-white">{trendResult.winRate}%</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center">
                <div className="text-blue-500 font-black text-xs uppercase mb-2">Média Gols</div>
                <div className="text-4xl font-black text-white">{trendResult.avgGoalsScored}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center border-l-4 border-l-emerald-500">
                <div className="text-slate-500 font-black text-xs uppercase mb-2">Estratégia Ideal</div>
                <div className="text-xl font-black text-emerald-400 uppercase">{trendResult.bestStrategy}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryMode;
