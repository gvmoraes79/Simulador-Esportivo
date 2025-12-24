
import React, { useState } from 'react';
import { runVarAnalysis, findMatchesByYear } from '../services/geminiService';
import { VarAnalysisResult, MatchCandidate } from '../types';
import { MonitorPlay, Search, Loader2, Flag, AlertTriangle, Inbox, RefreshCw, ExternalLink, Newspaper, ChevronLeft } from 'lucide-react';

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
      alert("Por favor, informe os dois times.");
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
      console.error("Search Error:", e);
      alert("Erro ao pesquisar confrontos. Tente novamente em instantes.");
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
      console.error("Analysis Error:", e);
      alert(e.message || "Não foi possível analisar este jogo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       {/* Barra de Busca */}
       <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <MonitorPlay size={80} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mandante</label>
              <input type="text" placeholder="Ex: Flamengo" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={teamA} onChange={e => setTeamA(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visitante</label>
              <input type="text" placeholder="Ex: Vasco" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={teamB} onChange={e => setTeamB(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ano</label>
              <input type="number" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={year} onChange={e => setYear(e.target.value)} />
            </div>
            <button onClick={handleSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
               {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Buscar Partidas</>}
            </button>
          </div>
       </div>

       {/* Lista de Resultados de Busca */}
       {hasSearched && candidates.length > 0 && !result && (
          <div className="space-y-4">
             <h3 className="text-white font-black uppercase text-xs tracking-widest ml-2 flex items-center gap-2">
               <Newspaper size={14} className="text-cyan-400" /> Resultados encontrados em {year}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((c, i) => (
                   <button key={i} onClick={() => handleAnalyze(c)} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-left hover:border-cyan-500 transition-all group flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">{c.competition}</div>
                        <div className="text-white font-black text-lg">{c.homeTeam} {c.score} {c.awayTeam}</div>
                        <div className="text-slate-500 text-[10px] font-mono mt-1">{c.date}</div>
                      </div>
                      <div className="bg-cyan-500/10 text-cyan-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-cyan-500 group-hover:text-white transition-all">
                        Analisar VAR
                      </div>
                   </button>
                ))}
             </div>
          </div>
       )}

       {/* Empty State */}
       {hasSearched && candidates.length === 0 && !loading && (
          <div className="bg-slate-900/50 border border-slate-800 p-20 rounded-[3rem] text-center space-y-4">
             <Inbox className="mx-auto text-slate-700" size={48} />
             <div className="text-slate-400 font-bold">Nenhum confronto oficial encontrado para este período.</div>
             <p className="text-slate-600 text-xs">Dica: Use nomes simples dos clubes e verifique se o ano está correto.</p>
          </div>
       )}

       {/* Análise de Arbitragem */}
       {result && (
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 shadow-2xl animate-fade-in-up">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
                <div>
                  <button onClick={() => setResult(null)} className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-4 hover:underline">
                    <ChevronLeft size={14} /> Voltar aos resultados
                  </button>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{result.match}</h2>
                  <div className="text-slate-500 text-xs font-mono">{result.date}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-slate-800 px-6 py-3 rounded-2xl text-cyan-400 font-black border border-slate-700 flex items-center gap-3">
                    <Flag size={20} /> {result.referee}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nota da Atuação: {result.refereeGrade || 'N/A'}/10</div>
                </div>
             </div>
             
             <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 relative">
                <div className="absolute -top-3 left-8 bg-slate-900 px-4 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800">Parecer Geral</div>
                <p className="text-slate-300 italic text-sm leading-relaxed">"{result.summary}"</p>
             </div>

             <div className="space-y-4">
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                   <AlertTriangle size={14} className="text-amber-500" /> Crônica de Lances Polêmicos
                </h4>
                {result.incidents.length > 0 ? result.incidents.map((inc, i) => (
                   <div key={i} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 hover:bg-slate-950 transition-colors">
                      <div className="bg-cyan-500 p-3 rounded-2xl text-slate-950 font-black h-fit min-w-[55px] text-center shadow-lg">{inc.minute}'</div>
                      <div className="flex-1 space-y-3">
                         <div className="text-white font-bold text-lg">{inc.description}</div>
                         <div className="bg-slate-900/50 p-5 rounded-xl text-slate-400 text-sm leading-relaxed border-l-4 border-cyan-900">
                           <span className="text-[10px] font-bold text-cyan-500 block mb-2 uppercase tracking-widest">Comentário da Imprensa:</span>
                           {inc.expertOpinion}
                         </div>
                         <div className={`inline-block px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                           inc.verdict === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-500' : 
                           inc.verdict === 'ERROR' ? 'bg-red-500/10 text-red-500' : 
                           'bg-amber-500/10 text-amber-500'
                         }`}>
                            Veredito IA: {inc.verdict === 'CORRECT' ? 'Acerto' : inc.verdict === 'ERROR' ? 'Erro de Arbitragem' : 'Lance Interpretativo'}
                         </div>
                      </div>
                   </div>
                )) : (
                  <div className="text-slate-600 text-xs italic p-16 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                    Não foram encontrados registros de lances capitais polêmicos para este jogo nos portais consultados.
                  </div>
                )}
             </div>

             {result.sources.length > 0 && (
                <div className="pt-8 border-t border-slate-800">
                   <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Fontes Consultadas:</h5>
                   <div className="flex flex-wrap gap-3">
                      {result.sources.map((s, i) => (
                         <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-[10px] text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-all flex items-center gap-2">
                            <ExternalLink size={12} /> {s.title}
                         </a>
                      ))}
                   </div>
                </div>
             )}
          </div>
       )}
    </div>
  );
};

export default VarMode;
