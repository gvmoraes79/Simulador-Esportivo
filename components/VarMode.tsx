
import React, { useState } from 'react';
import { runVarAnalysis, findMatchesByYear } from '../services/geminiService';
import { VarAnalysisResult, MatchCandidate } from '../types';
import { MonitorPlay, Search, Loader2, Flag, AlertTriangle, Inbox, RefreshCw, ExternalLink, Newspaper } from 'lucide-react';

const VarMode: React.FC = () => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [result, setResult] = useState<VarAnalysisResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!teamA.trim() || !teamB.trim()) {
      alert("Por favor, digite o nome de dois times.");
      return;
    }
    setLoading(true);
    setResult(null);
    setCandidates([]);
    setHasSearched(false);
    try {
      const data = await findMatchesByYear(teamA, teamB, year);
      setCandidates(data);
      setHasSearched(true);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao conectar com o serviço de busca. Tente nomes mais simples.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (m: MatchCandidate) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await runVarAnalysis(m.homeTeam, m.awayTeam, m.date);
      setResult(data);
    } catch (e: any) {
      alert(e.message || "Erro ao buscar polêmicas deste jogo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <MonitorPlay size={120} />
          </div>
          
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Time A</label>
            <input type="text" placeholder="Ex: Flamengo" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={teamA} onChange={e => setTeamA(e.target.value)} />
          </div>
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Time B</label>
            <input type="text" placeholder="Ex: Palmeiras" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={teamB} onChange={e => setTeamB(e.target.value)} />
          </div>
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-widest">Ano</label>
            <input type="number" placeholder="Ano" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <button onClick={handleSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50 relative z-10">
             {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Localizar Jogos</>}
          </button>
       </div>

       {hasSearched && candidates.length === 0 && !loading && (
          <div className="bg-slate-900/50 border border-slate-800 p-16 rounded-[2.5rem] text-center space-y-4">
             <Inbox className="mx-auto text-slate-700" size={48} />
             <div className="text-slate-400 font-bold">Nenhum confronto oficial encontrado para {teamA} x {teamB} em {year}.</div>
             <p className="text-slate-600 text-xs max-w-xs mx-auto">Tente nomes mais curtos dos times ou verifique o ano selecionado.</p>
          </div>
       )}

       {candidates.length > 0 && !result && (
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-4">
             <h3 className="text-white font-black uppercase text-xs tracking-widest ml-1 flex items-center gap-2">
               <Newspaper size={14} className="text-cyan-400" /> Selecione o jogo para análise de VAR
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((c, i) => (
                   <button key={i} onClick={() => handleAnalyze(c)} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left hover:border-cyan-500/50 hover:bg-slate-900 transition-all group border-l-4 border-l-slate-800 hover:border-l-cyan-500">
                      <div className="text-cyan-400 text-[10px] font-bold uppercase mb-1 tracking-widest">{c.competition}</div>
                      <div className="text-white font-black text-lg group-hover:text-cyan-50 transition-colors flex justify-between items-center">
                         <span>{c.homeTeam} {c.score} {c.awayTeam}</span>
                         <div className="bg-cyan-900/20 text-cyan-500 px-3 py-1 rounded-lg text-[10px]">Analisar</div>
                      </div>
                      <div className="text-slate-500 text-xs mt-1 font-mono">{c.date}</div>
                   </button>
                ))}
             </div>
          </div>
       )}

       {result && (
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 shadow-2xl animate-fade-in-up">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{result.match}</h2>
                  <div className="text-slate-500 text-xs font-mono">{result.date}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-slate-800 px-6 py-2 rounded-xl text-cyan-400 font-black border border-slate-700 flex items-center gap-3">
                    <Flag size={16} /> Árbitro: {result.referee}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nota Arbitragem: {result.refereeGrade || 'N/A'}</div>
                </div>
             </div>
             
             <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 relative">
                <div className="absolute -top-3 left-8 bg-slate-900 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800">Resumo da Imprensa</div>
                <p className="text-slate-300 italic text-sm leading-relaxed">"{result.summary}"</p>
             </div>

             <div className="space-y-4">
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                   <AlertTriangle size={14} className="text-amber-500" /> Incidentes e Polêmicas
                </h4>
                {result.incidents.length > 0 ? result.incidents.map((inc, i) => (
                   <div key={i} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 hover:bg-slate-950 transition-colors">
                      <div className="bg-cyan-500 p-3 rounded-2xl text-slate-950 font-black h-fit min-w-[50px] text-center shadow-lg shadow-cyan-900/10">{inc.minute}'</div>
                      <div className="flex-1 space-y-3">
                         <div className="text-white font-bold text-lg">{inc.description}</div>
                         <div className="bg-slate-900/50 p-4 rounded-xl text-slate-400 text-sm leading-relaxed border-l-2 border-slate-800">
                           <span className="text-[10px] font-bold text-slate-500 block mb-2 uppercase tracking-widest">Opinião dos Especialistas:</span>
                           {inc.expertOpinion}
                         </div>
                         <div className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                           inc.verdict === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-500' : 
                           inc.verdict === 'ERROR' ? 'bg-red-500/10 text-red-500' : 
                           'bg-amber-500/10 text-amber-500'
                         }`}>
                            Veredito IA: {inc.verdict === 'CORRECT' ? 'Decisão Correta' : inc.verdict === 'ERROR' ? 'Erro de Arbitragem' : 'Lance Interpretativo'}
                         </div>
                      </div>
                   </div>
                )) : (
                  <div className="text-slate-600 text-xs italic p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                    Nenhum lance polêmico relevante encontrado nos principais portais para este jogo.
                  </div>
                )}
             </div>

             {result.sources.length > 0 && (
                <div className="pt-6 border-t border-slate-800">
                   <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Fontes da Pesquisa:</h5>
                   <div className="flex flex-wrap gap-2">
                      {result.sources.map((s, i) => (
                         <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="bg-slate-950 px-4 py-2 rounded-full border border-slate-800 text-[10px] text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-all flex items-center gap-2">
                            <ExternalLink size={10} /> {s.title}
                         </a>
                      ))}
                   </div>
                </div>
             )}

             <div className="flex justify-center pt-4">
                <button onClick={() => { setResult(null); }} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2">
                  <RefreshCw size={12} /> Selecionar outra partida
                </button>
             </div>
          </div>
       )}
    </div>
  );
};

export default VarMode;
