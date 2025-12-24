
import React, { useState } from 'react';
import { BatchMatchInput, BatchResultItem, RiskLevel } from '../types';
import { fetchLoteriaMatches, runBatchSimulation } from '../services/geminiService';
import { Search, Loader2, Trophy, Ticket, RefreshCcw } from 'lucide-react';

const BatchMode: React.FC = () => {
  const [matches, setMatches] = useState<BatchMatchInput[]>([]);
  const [results, setResults] = useState<BatchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [concurso, setConcurso] = useState('');
  const [progress, setProgress] = useState('');

  const handleFetch = async () => {
    if (!concurso) return alert("Informe o número do concurso.");
    setLoading(true);
    setResults([]);
    try {
      const data = await fetchLoteriaMatches(concurso);
      if (data.length === 0) throw new Error();
      setMatches(data);
    } catch (e: any) {
      alert("Não foi possível carregar os jogos. Tente outro concurso.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (matches.length === 0) return;
    setLoading(true);
    try {
      const data = await runBatchSimulation(matches, RiskLevel.MODERATE, (c, t, m) => setProgress(`${c}/${t}: ${m}`));
      setResults(data);
    } catch (e) {
      alert("Erro durante a simulação.");
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-end shadow-2xl">
          <div className="flex-1 space-y-2">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Loteca - Concurso</label>
             <input type="number" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-emerald-500 transition-all" value={concurso} onChange={e => setConcurso(e.target.value)} placeholder="Ex: 1152" />
          </div>
          <button onClick={handleFetch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all disabled:opacity-50 h-[60px]">
             {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Carregar Jogos</>}
          </button>
       </div>

       {matches.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-6">
             <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <div className="bg-emerald-500/20 p-2 rounded-lg"><Trophy size={18} className="text-emerald-500" /></div>
                   <h3 className="text-white font-black uppercase text-sm tracking-widest">Grade de Apostas</h3>
                </div>
                {!results.length ? (
                   <button onClick={handleSimulate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                      Simular Bilhete Completo
                   </button>
                ) : (
                  <button onClick={() => setResults([])} className="text-slate-500 hover:text-white text-[10px] font-black uppercase flex items-center gap-2">
                    <RefreshCcw size={12} /> Limpar Resultados
                  </button>
                )}
             </div>
             
             {progress && (
               <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-[10px] font-mono text-blue-400 flex items-center gap-3">
                 <Loader2 className="animate-spin" size={14} /> {progress}
               </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((m, i) => {
                   const res = results.find(r => r.id === m.id);
                   return (
                      <div key={m.id} className={`bg-slate-950 p-5 rounded-2xl border transition-all ${res ? 'border-emerald-500/30' : 'border-slate-800'} flex justify-between items-center`}>
                         <div className="flex flex-col">
                            <span className="text-[8px] text-slate-600 font-bold uppercase mb-1">Jogo {i+1}</span>
                            <div className="flex items-center gap-2">
                               <span className="font-black text-sm text-slate-200">{m.homeTeam}</span>
                               <span className="text-[10px] text-slate-700 italic">vs</span>
                               <span className="font-black text-sm text-slate-200">{m.awayTeam}</span>
                            </div>
                         </div>
                         {res && (
                            <div className="flex items-center gap-2">
                               <div className="text-right hidden sm:block">
                                  <div className="text-[8px] text-slate-500 font-bold uppercase">Sugestão</div>
                                  <div className="text-[10px] text-emerald-400 font-black">{res.bettingTip}</div>
                               </div>
                               <div className="bg-emerald-500 text-slate-950 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20">
                                  {res.bettingTipCode}
                               </div>
                            </div>
                         )}
                      </div>
                   )
                })}
             </div>
          </div>
       )}
    </div>
  );
};

export default BatchMode;
