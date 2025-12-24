
import React, { useState } from 'react';
import { runVarAnalysis, findMatchesByYear } from '../services/geminiService';
import { VarAnalysisResult, MatchCandidate } from '../types';
import { MonitorPlay, Search, Loader2, Flag, AlertTriangle, Inbox } from 'lucide-react';

const VarMode: React.FC = () => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [year, setYear] = useState('2024');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [result, setResult] = useState<VarAnalysisResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!teamA || !teamB) {
      alert("Informe os dois times para a pesquisa.");
      return;
    }
    setLoading(true);
    setResult(null);
    setHasSearched(false);
    try {
      const data = await findMatchesByYear(teamA, teamB, year);
      setCandidates(data);
      setHasSearched(true);
    } catch (e) {
      alert("Erro ao buscar partidas. Tente nomes mais simples ou verifique o ano.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (m: MatchCandidate) => {
    setLoading(true);
    try {
      const data = await runVarAnalysis(m.homeTeam, m.awayTeam, m.date);
      setResult(data);
    } catch (e: any) {
      alert(e.message || "Erro na análise do VAR.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-2xl">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Time A</label>
            <input type="text" placeholder="Ex: Flamengo" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all" value={teamA} onChange={e => setTeamA(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Time B</label>
            <input type="text" placeholder="Ex: Palmeiras" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all" value={teamB} onChange={e => setTeamB(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Ano</label>
            <input type="number" placeholder="Ano" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <button onClick={handleSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20">
             {loading ? <Loader2 className="animate-spin" size={20} /> : <><MonitorPlay size={20} /> Consultar Base</>}
          </button>
       </div>

       {hasSearched && candidates.length === 0 && !loading && (
          <div className="bg-slate-900/50 border border-slate-800 p-16 rounded-[2.5rem] text-center space-y-4">
             <Inbox className="mx-auto text-slate-700" size={48} />
             <div className="text-slate-400 font-bold">Nenhuma partida encontrada para estes critérios.</div>
             <p className="text-slate-600 text-xs">Tente ajustar o ano ou simplificar o nome dos times.</p>
          </div>
       )}

       {candidates.length > 0 && !result && (
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-4">
             <h3 className="text-white font-black uppercase text-xs tracking-widest ml-1 flex items-center gap-2">
               <Search size={14} className="text-cyan-400" /> Partidas Registradas
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((c, i) => (
                   <button key={i} onClick={() => handleAnalyze(c)} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left hover:border-cyan-500/50 hover:bg-slate-900 transition-all group">
                      <div className="text-cyan-400 text-[10px] font-bold uppercase mb-1 tracking-widest">{c.competition}</div>
                      <div className="text-white font-black text-lg group-hover:text-cyan-50 group-transition-colors">{c.homeTeam} {c.score} {c.awayTeam}</div>
                      <div className="text-slate-500 text-xs mt-1 font-mono">{c.date}</div>
                   </button>
                ))}
             </div>
          </div>
       )}

       {result && (
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 shadow-2xl animate-fade-in-up">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{result.match}</h2>
                  <div className="text-slate-500 text-xs font-mono">{result.date}</div>
                </div>
                <div className="bg-slate-800 px-6 py-2 rounded-xl text-cyan-400 font-black border border-slate-700 flex items-center gap-3">
                  <Flag size={16} /> Árbitro: {result.referee}
                </div>
             </div>
             
             <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 relative">
                <div className="absolute -top-3 left-8 bg-slate-900 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800">Súmula IA</div>
                <p className="text-slate-300 italic text-sm leading-relaxed">"{result.summary}"</p>
             </div>

             <div className="space-y-4">
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] ml-1">Análise de Incidentes</h4>
                {result.incidents.length > 0 ? result.incidents.map((inc, i) => (
                   <div key={i} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 hover:bg-slate-950 transition-colors">
                      <div className="bg-cyan-500 p-3 rounded-2xl text-slate-950 font-black h-fit min-w-[50px] text-center shadow-lg shadow-cyan-900/10">{inc.minute}'</div>
                      <div className="flex-1 space-y-3">
                         <div className="text-white font-bold text-lg">{inc.description}</div>
                         <div className="text-slate-400 text-sm leading-relaxed border-l-2 border-slate-800 pl-4">{inc.expertOpinion}</div>
                         <div className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                           inc.verdict === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-500' : 
                           inc.verdict === 'ERROR' ? 'bg-red-500/10 text-red-500' : 
                           'bg-amber-500/10 text-amber-500'
                         }`}>
                            Veredito: {inc.verdict === 'CORRECT' ? 'Acerto' : inc.verdict === 'ERROR' ? 'Erro' : 'Controverso'}
                         </div>
                      </div>
                   </div>
                )) : (
                  <div className="text-slate-600 text-xs italic p-4 text-center">Nenhum incidente polêmico registrado nesta partida.</div>
                )}
             </div>

             <div className="flex justify-center pt-4">
                <button onClick={() => { setResult(null); }} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                  Voltar para lista
                </button>
             </div>
          </div>
       )}
    </div>
  );
};

export default VarMode;
