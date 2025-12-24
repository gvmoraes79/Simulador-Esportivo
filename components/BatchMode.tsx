
import React, { useState } from 'react';
import { BatchMatchInput, BatchResultItem, RiskLevel } from '../types';
import { fetchLoteriaMatches, runBatchSimulation } from '../services/geminiService';
import { Search, Loader2, Trophy, RefreshCcw } from 'lucide-react';

const BatchMode: React.FC = () => {
  const [matches, setMatches] = useState<BatchMatchInput[]>([]);
  const [results, setResults] = useState<BatchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [concurso, setConcurso] = useState('');
  const [progress, setProgress] = useState('');

  const handleFetch = async () => {
    if (!concurso) return alert("Informe o concurso.");
    setLoading(true);
    setResults([]);
    try {
      const data = await fetchLoteriaMatches(concurso);
      if (data.length === 0) throw new Error("Vazio");
      setMatches(data);
    } catch (e) {
      alert("Erro ao buscar jogos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const data = await runBatchSimulation(matches, RiskLevel.MODERATE, (c, t, m) => setProgress(`${c}/${t}: ${m}`));
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
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loteca Concurso</label>
          <input type="number" className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" value={concurso} onChange={e => setConcurso(e.target.value)} placeholder="Ex: 1152" />
        </div>
        <button onClick={handleFetch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-xl flex items-center gap-2 h-[58px] transition-all">
          {loading ? <Loader2 className="animate-spin" /> : "Buscar Jogos"}
        </button>
      </div>

      {matches.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-6">
            <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
              <Trophy size={18} className="text-emerald-500" /> Grade de Apostas ({matches.length}/14)
            </h3>
            <button onClick={handleSimulate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              {loading ? progress || "Simulando..." : "Simular Bilhete"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((m, i) => {
              const res = results.find(r => r.id === m.id);
              return (
                <div key={m.id} className={`bg-slate-950 p-5 rounded-2xl border ${res ? 'border-emerald-500/30' : 'border-slate-800'} flex justify-between items-center`}>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-600 font-bold uppercase mb-1">Jogo {i+1}</span>
                    <div className="font-black text-sm text-slate-200">{m.homeTeam} x {m.awayTeam}</div>
                  </div>
                  {res && (
                    <div className="bg-emerald-500 text-slate-950 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg">
                      {res.bettingTipCode}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchMode;
