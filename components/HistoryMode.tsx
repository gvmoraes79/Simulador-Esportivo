
import React, { useState } from 'react';
import { History, Search, Loader2, TrendingUp, BarChart3, Calculator, Swords, Target } from 'lucide-react';
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
    if (!matchInput.home || !matchInput.away || !matchInput.date) return alert("Preencha Mandante, Visitante e Data.");
    setLoading(true);
    setMatchResult(null);
    try {
      const input: MatchInput = {
        homeTeamName: matchInput.home,
        awayTeamName: matchInput.away,
        date: matchInput.date,
        homeMood: TeamMood.REGULAR,
        awayMood: TeamMood.REGULAR,
        riskLevel: RiskLevel.MODERATE,
        observations: `ANÁLISE RETROSPECTIVA. O jogo já aconteceu. O placar real foi: ${matchInput.score || 'Não informado'}. Analise por que o resultado foi esse ou o que a IA teria previsto.`
      };
      const data = await runSimulation(input);
      setMatchResult(data);
    } catch (e) {
      alert("Erro na análise do jogo. Verifique sua conexão ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrendAnalysis = async () => {
    if (!trendInput.team) return alert("Informe o nome da equipe.");
    setLoading(true);
    setTrendResult(null);
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
        <button onClick={() => setActiveTab('match')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'match' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
          <Calculator size={14} /> Jogo Específico
        </button>
        <button onClick={() => setActiveTab('trends')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'trends' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
          <TrendingUp size={14} /> Tendências de Equipe
        </button>
      </div>

      {activeTab === 'match' ? (
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Swords size={100} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mandante</label>
                <input type="text" placeholder="Ex: Santos" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500 transition-all" value={matchInput.home} onChange={e => setMatchInput({...matchInput, home: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visitante</label>
                <input type="text" placeholder="Ex: Flamengo" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500 transition-all" value={matchInput.away} onChange={e => setMatchInput({...matchInput, away: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
                <input type="date" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500 font-mono" value={matchInput.date} onChange={e => setMatchInput({...matchInput, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Placar Real (Opc.)</label>
                <input type="text" placeholder="Ex: 2-1" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500 text-center font-black" value={matchInput.score} onChange={e => setMatchInput({...matchInput, score: e.target.value})} />
              </div>
              <button onClick={handleMatchAnalysis} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 h-[58px] transition-all shadow-lg shadow-emerald-900/20">
                {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Analisar</>}
              </button>
            </div>
          </div>

          {matchResult && (
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 animate-fade-in-up shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-8">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Confronto Histórico</h3>
                  <p className="text-slate-500 text-[10px] font-mono mt-1">DATA DA PARTIDA: {matchInput.date}</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800 text-center">
                    <div className="text-emerald-500 font-black text-xl">{matchResult.predictedScore?.home ?? '?'} - {matchResult.predictedScore?.away ?? '?'}</div>
                    <div className="text-[8px] text-slate-600 font-bold uppercase mt-1">Predição IA</div>
                  </div>
                  {matchInput.score && (
                    <div className="bg-slate-950 px-6 py-3 rounded-2xl border border-emerald-500/30 text-center">
                      <div className="text-white font-black text-xl">{matchInput.score}</div>
                      <div className="text-[8px] text-emerald-500 font-bold uppercase mt-1">Resultado Real</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 border-l-4 border-l-emerald-500">
                <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <BarChart3 size={14} /> Parecer Técnico Retrospectivo
                </h4>
                <p className="text-slate-300 italic leading-relaxed text-sm">
                  "{matchResult.analysisText || "Análise indisponível para este confronto específico."}"
                </p>
              </div>

              {matchResult.bettingTip && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-2xl flex items-center gap-4">
                  <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-black text-[10px]">VEREDITO</div>
                  <div className="text-sm font-bold text-emerald-400">Sugestão Histórica: {matchResult.bettingTip}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp size={100} />
            </div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Equipe</label>
              <input type="text" placeholder="Ex: Palmeiras" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={trendInput.team} onChange={e => setTrendInput({...trendInput, team: e.target.value})} />
            </div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Competição</label>
              <input type="text" placeholder="Ex: Libertadores" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={trendInput.competition} onChange={e => setTrendInput({...trendInput, competition: e.target.value})} />
            </div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ano</label>
              <input type="text" placeholder="2023" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={trendInput.year} onChange={e => setTrendInput({...trendInput, year: e.target.value})} />
            </div>
            <button onClick={handleTrendAnalysis} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl h-[58px] transition-all relative z-10">
              {loading ? <Loader2 className="animate-spin" /> : "Analisar Temporada"}
            </button>
          </div>

          {trendResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] text-center space-y-3 shadow-xl border-b-4 border-b-emerald-500">
                <div className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Aproveitamento</div>
                <div className="text-5xl font-black text-white">{trendResult.winRate ?? 0}%</div>
                <div className="text-[8px] text-slate-600 font-bold uppercase">Taxa de Vitórias</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] text-center space-y-3 shadow-xl border-b-4 border-b-blue-500">
                <div className="text-blue-500 font-black text-[10px] uppercase tracking-widest">Média Gols</div>
                <div className="text-5xl font-black text-white">{trendResult.avgGoalsScored ?? 0}</div>
                <div className="text-[8px] text-slate-600 font-bold uppercase">Gols Pró por Jogo</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] text-center space-y-3 shadow-xl border-b-4 border-b-amber-500">
                <div className="text-amber-500 font-black text-[10px] uppercase tracking-widest">Estratégia Ideal</div>
                <div className="text-2xl font-black text-white uppercase italic">{trendResult.bestStrategy || "N/A"}</div>
                <div className="text-[8px] text-slate-600 font-bold uppercase">Baseado em Consistência</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryMode;
