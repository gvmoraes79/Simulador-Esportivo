
import React, { useState } from 'react';
import { BatchMatchInput, BatchResultItem, RiskLevel } from '../types';
import { fetchLoteriaMatches, runBatchSimulation } from '../services/geminiService';
import { Plus, Trash2, Search, Loader2, Trophy, Ticket, FileDown } from 'lucide-react';

const BatchMode: React.FC = () => {
  const [matches, setMatches] = useState<BatchMatchInput[]>([]);
  const [results, setResults] = useState<BatchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [concurso, setConcurso] = useState('');
  const [progress, setProgress] = useState('');

  const handleFetch = async () => {
    setLoading(true);
    try {
      const data = await fetchLoteriaMatches(concurso);
      setMatches(data);
    } catch (e: any) {
      alert("Erro ao buscar jogos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const data = await runBatchSimulation(matches, RiskLevel.MODERATE, '', (_, __, m) => setProgress(m));
      setResults(data);
    } catch (e) {
      alert("Erro na simulação em lote.");
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nº do Concurso</label>
             <input type="number" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" value={concurso} onChange={e => setConcurso(e.target.value)} placeholder="Ex: 1150" />
          </div>
          <button onClick={handleFetch} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all">
             <Search size={20} /> Importar Loteca
          </button>
       </div>

       {matches.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-3">
                   <Ticket className="text-emerald-500" /> Card de Jogos
                </h3>
                <button onClick={handleSimulate} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
                   {loading ? <Loader2 className="animate-spin" /> : 'Simular Bilhete'}
                </button>
             </div>
             
             {progress && <div className="text-xs text-blue-400 font-mono animate-pulse">{progress}</div>}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((m, i) => {
                   const res = results.find(r => r.id === m.id);
                   return (
                      <div key={m.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center group">
                         <span className="text-[10px] text-slate-700 font-mono">#{i+1}</span>
                         <div className="flex-1 px-4 flex justify-between items-center">
                            <span className="font-bold text-sm text-slate-300">{m.homeTeam}</span>
                            <span className="text-[10px] text-slate-800 mx-2">VS</span>
                            <span className="font-bold text-sm text-slate-300">{m.awayTeam}</span>
                         </div>
                         {res && (
                            <div className="bg-emerald-500/10 px-3 py-1 rounded-lg text-emerald-400 font-black text-xs">
                               {res.bettingTipCode}
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
