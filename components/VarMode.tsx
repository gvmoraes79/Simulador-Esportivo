
import React, { useState } from 'react';
import { runVarAnalysis } from '../services/geminiService';
import { VarAnalysisResult } from '../types';
import { MonitorPlay, Search, Loader2, Flag, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

const VarMode: React.FC = () => {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VarAnalysisResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA || !teamB) return alert("Informe os dois times.");
    setLoading(true);
    setResult(null);
    try {
      const data = await runVarAnalysis(teamA, teamB, date);
      setResult(data);
    } catch (e: any) {
      alert(e.message || "Erro na análise de arbitragem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
             <MonitorPlay size={120} />
          </div>
          
          <form onSubmit={handleAnalyze} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Time da Casa</label>
              <input type="text" placeholder="Ex: Flamengo" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={teamA} onChange={e => setTeamA(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Time Visitante</label>
              <input type="text" placeholder="Ex: Vasco" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={teamB} onChange={e => setTeamB(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
              <input type="date" className="bg-slate-950 w-full p-4 rounded-xl border border-slate-800 focus:border-cyan-500 outline-none transition-all text-white" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 h-[60px]">
               {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Analisar Polêmicas</>}
            </button>
          </form>
       </div>

       {result && (
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 shadow-2xl animate-fade-in-up">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{result.match}</h2>
                  <div className="text-slate-500 text-xs font-mono">{result.date}</div>
                </div>
                <div className="bg-slate-800 px-6 py-3 rounded-2xl text-cyan-400 font-black border border-slate-700 flex items-center gap-3">
                  <Flag size={20} /> {result.referee}
                </div>
             </div>
             
             <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800">
                <p className="text-slate-300 italic text-sm leading-relaxed">"{result.summary}"</p>
             </div>

             <div className="space-y-4">
                <h4 className="text-white font-black text-xs uppercase tracking-widest ml-2 flex items-center gap-2">
                   <AlertTriangle size={14} className="text-amber-500" /> Incidentes Registrados
                </h4>
                {result.incidents.map((inc, i) => (
                   <div key={i} className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6">
                      <div className="bg-cyan-500 p-3 rounded-2xl text-slate-950 font-black h-fit min-w-[55px] text-center shadow-lg">{inc.minute}'</div>
                      <div className="flex-1 space-y-3">
                         <div className="text-white font-bold text-lg">{inc.description}</div>
                         <div className="bg-slate-900/50 p-5 rounded-xl text-slate-400 text-sm leading-relaxed border-l-4 border-cyan-900">
                           {inc.expertOpinion}
                         </div>
                         <div className={`inline-block px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                           inc.verdict === 'CORRECT' ? 'bg-emerald-500/10 text-emerald-500' : 
                           inc.verdict === 'ERROR' ? 'bg-red-500/10 text-red-500' : 
                           'bg-amber-500/10 text-amber-500'
                         }`}>
                            Veredito: {inc.verdict === 'CORRECT' ? 'Correto' : inc.verdict === 'ERROR' ? 'Erro' : 'Interpretativo'}
                         </div>
                      </div>
                   </div>
                ))}
             </div>

             {result.sources.length > 0 && (
                <div className="pt-8 border-t border-slate-800">
                   <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Fontes:</h5>
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
