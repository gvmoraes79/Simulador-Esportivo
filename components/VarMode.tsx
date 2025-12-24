
import React, { useState } from 'react';
import { runVarAnalysis, findMatchesByYear } from '../services/geminiService';
import { VarAnalysisResult, MatchCandidate } from '../types';
import { MonitorPlay, Search, Loader2, Flag, AlertTriangle } from 'lucide-react';

const VarMode: React.FC = () => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [year, setYear] = useState('2024');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [result, setResult] = useState<VarAnalysisResult | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await findMatchesByYear(teamA, teamB, year);
      setCandidates(data);
    } catch (e) {
      alert("Erro ao buscar partidas.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (m: MatchCandidate) => {
    setLoading(true);
    try {
      const data = await runVarAnalysis(m.homeTeam, m.awayTeam, m.date);
      setResult(data);
    } catch (e) {
      alert("Erro na análise do VAR.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <input type="text" placeholder="Time 1" className="bg-slate-950 p-4 rounded-xl border border-slate-800" value={teamA} onChange={e => setTeamA(e.target.value)} />
          <input type="text" placeholder="Time 2" className="bg-slate-950 p-4 rounded-xl border border-slate-800" value={teamB} onChange={e => setTeamB(e.target.value)} />
          <input type="number" placeholder="Ano" className="bg-slate-950 p-4 rounded-xl border border-slate-800" value={year} onChange={e => setYear(e.target.value)} />
          <button onClick={handleSearch} className="bg-cyan-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2">
             <MonitorPlay size={20} /> Consultar VAR
          </button>
       </div>

       {loading && <div className="flex justify-center"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>}

       {candidates.length > 0 && !result && (
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-4">
             <h3 className="text-white font-black uppercase text-xs tracking-widest">Partidas Encontradas</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((c, i) => (
                   <button key={i} onClick={() => handleAnalyze(c)} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left hover:border-cyan-500/50 transition-all">
                      <div className="text-cyan-400 text-[10px] font-bold uppercase mb-1">{c.competition}</div>
                      <div className="text-white font-black text-lg">{c.homeTeam} {c.score} {c.awayTeam}</div>
                      <div className="text-slate-500 text-xs mt-1">{c.date}</div>
                   </button>
                ))}
             </div>
          </div>
       )}

       {result && (
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-white italic uppercase">{result.match}</h2>
                <div className="bg-slate-800 px-6 py-2 rounded-xl text-cyan-400 font-black border border-slate-700">Ref: {result.referee}</div>
             </div>
             
             <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800">
                <p className="text-slate-400 italic text-sm">"{result.summary}"</p>
             </div>

             <div className="space-y-4">
                {result.incidents.map((inc, i) => (
                   <div key={i} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6">
                      <div className="bg-cyan-500 p-3 rounded-2xl text-slate-950 font-black h-fit">{inc.minute}'</div>
                      <div className="flex-1 space-y-2">
                         <div className="text-white font-bold">{inc.description}</div>
                         <div className="text-slate-500 text-xs">{inc.expertOpinion}</div>
                         <div className={`text-[10px] font-black uppercase tracking-widest ${inc.verdict === 'CORRECT' ? 'text-emerald-500' : 'text-red-500'}`}>
                            Verdict: {inc.verdict}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       )}
    </div>
  );
};

export default VarMode;
