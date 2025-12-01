
import React, { useState, useMemo } from 'react';
import { BatchMatchInput, BatchResultItem } from '../types';
import { runBatchSimulation, fetchLoteriaMatches, checkMatchResults } from '../services/geminiService';
import { Plus, Trash2, Play, Loader2, Download, Search, Ticket, Check, AlertCircle, Trophy, Lightbulb, TrendingUp, RotateCcw, X, Info } from 'lucide-react';

const BatchMode: React.FC = () => {
  const [matches, setMatches] = useState<BatchMatchInput[]>([
    { id: '1', homeTeam: '', awayTeam: '', date: new Date().toISOString().split('T')[0] }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingLoteria, setLoadingLoteria] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState<BatchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loteriaConcurso, setLoteriaConcurso] = useState('');

  const addMatch = () => {
    const lastId = matches.length > 0 ? parseInt(matches[matches.length - 1].id) : 0;
    const newId = (lastId + 1).toString();
    setMatches([...matches, { id: newId, homeTeam: '', awayTeam: '', date: new Date().toISOString().split('T')[0] }]);
  };

  const removeMatch = (id: string) => {
    setMatches(matches.filter(m => m.id !== id));
  };

  const updateMatch = (id: string, field: keyof BatchMatchInput, value: string) => {
    setMatches(matches.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleFetchLoteria = async () => {
    if (!loteriaConcurso) return;
    
    setLoadingLoteria(true);
    setError(null);
    setResults([]);
    try {
      const loteriaMatches = await fetchLoteriaMatches(loteriaConcurso);
      if (loteriaMatches && loteriaMatches.length > 0) {
        setMatches(loteriaMatches);
      } else {
        setError("Nenhum jogo encontrado para este concurso.");
      }
    } catch (e: any) {
      setError(e.message || "Erro ao buscar jogos da loteria.");
    } finally {
      setLoadingLoteria(false);
    }
  };

  const handleUpdateResults = async () => {
    if (matches.length === 0) return;
    setLoadingResults(true);
    try {
      const updatedMatches = await checkMatchResults(matches);
      setMatches(updatedMatches);
    } catch (e) {
      console.error(e);
      setError("Erro ao buscar placares atualizados.");
    } finally {
      setLoadingResults(false);
    }
  };

  const handleSimulate = async () => {
    if (matches.length === 0 || matches.some(m => !m.homeTeam || !m.awayTeam)) {
      setError("Preencha todos os times antes de simular.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await runBatchSimulation(matches);
      setResults(data);
    } catch (e) {
      setError("Erro ao simular em lote. Tente menos jogos ou verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine hit/miss based on Betting Tip Code
  const checkPrediction = (res: BatchResultItem, actualHome: number, actualAway: number) => {
    const actualResult = 
      actualHome > actualAway ? '1' :
      actualAway > actualHome ? '2' : 'X';
    
    const tip = res.bettingTipCode ? res.bettingTipCode.toUpperCase() : '';

    if (tip === 'ALL') return true; // Triplo acerta sempre
    if (tip === '1' && actualResult === '1') return true;
    if (tip === '2' && actualResult === '2') return true;
    if (tip === 'X' && actualResult === 'X') return true;
    
    // Dupla Chance
    if (tip === '1X' && (actualResult === '1' || actualResult === 'X')) return true;
    if (tip === 'X2' && (actualResult === 'X' || actualResult === '2')) return true;
    if (tip === '12' && (actualResult === '1' || actualResult === '2')) return true;

    return false;
  };

  // Translate betting codes to readable text
  const getTipDescription = (code: string) => {
    const c = code ? code.toUpperCase() : '';
    switch(c) {
      case '1': return 'Casa Vence';
      case '2': return 'Visitante Vence';
      case 'X': return 'Empate';
      case '1X': return 'Casa ou Empate';
      case 'X2': return 'Visitante ou Empate';
      case '12': return 'Sem Empate';
      case 'ALL': return 'Qualquer Resultado';
      default: return c;
    }
  };

  // Lógica de comparação de resultados
  const accuracyStats = useMemo(() => {
    if (results.length === 0) return null;

    let hits = 0;
    let misses = 0;
    let totalWithResults = 0;

    results.forEach(res => {
      const matchInput = matches.find(m => m.id === res.id);
      if (matchInput && 
          matchInput.actualHomeScore !== undefined && matchInput.actualHomeScore !== null &&
          matchInput.actualAwayScore !== undefined && matchInput.actualAwayScore !== null) {
        totalWithResults++;
        if (checkPrediction(res, matchInput.actualHomeScore, matchInput.actualAwayScore)) {
          hits++;
        } else {
          misses++;
        }
      }
    });

    if (totalWithResults === 0) return null;

    return {
      hits,
      misses,
      total: totalWithResults,
      percentage: Math.round((hits / totalWithResults) * 100)
    };
  }, [results, matches]);

  const getResultBadge = (res: BatchResultItem) => {
    const matchInput = matches.find(m => m.id === res.id);
    if (!matchInput || matchInput.actualHomeScore === undefined || matchInput.actualHomeScore === null || matchInput.actualAwayScore === undefined) return null;

    const actualHome = matchInput.actualHomeScore;
    const actualAway = matchInput.actualAwayScore!;
    const isHit = checkPrediction(res, actualHome, actualAway);

    return (
      <div className={`flex items-center gap-2 mt-3 p-3 rounded-lg border-l-4 ${isHit ? 'bg-emerald-950/40 border-l-emerald-400' : 'bg-red-950/40 border-l-red-500'}`}>
        {isHit ? <Check size={20} className="text-emerald-400" /> : <X size={20} className="text-red-500" />}
        <div className="flex flex-col">
          <span className={`text-sm font-black uppercase tracking-wider ${isHit ? 'text-emerald-300' : 'text-red-300'}`}>
            {isHit ? 'Sugestão Certa' : 'Sugestão Errada'}
          </span>
          <span className="text-xs text-slate-300 font-mono mt-0.5">
            Real: <span className="text-white font-bold">{actualHome} x {actualAway}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Import Section - Ticket Style */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-yellow-500/10 to-transparent"></div>
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
           <Download size={18} className="text-yellow-500" /> Importar Concurso Loteria
        </h3>
        <div className="flex flex-col md:flex-row gap-3 relative z-10">
          <input 
            type="number" 
            placeholder="Nº Concurso"
            className="flex-1 bg-black/40 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-500 placeholder:text-slate-500 font-mono"
            value={loteriaConcurso}
            onChange={(e) => setLoteriaConcurso(e.target.value)}
          />
          <button 
            onClick={handleFetchLoteria}
            disabled={loadingLoteria || !loteriaConcurso}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-yellow-900/20"
          >
            {loadingLoteria ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            Buscar Jogos
          </button>
        </div>
      </div>

      {/* Manual Input Section */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase">
            <Ticket className="text-emerald-400" /> Bilhete de Jogos
          </h2>
          <div className="flex gap-2">
             <button
               onClick={handleUpdateResults}
               disabled={loadingResults || matches.length === 0}
               className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-4 py-2 rounded-full flex items-center gap-1 transition-all border border-slate-700 font-bold"
               title="Buscar placares reais na web"
             >
                {loadingResults ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                <span className="hidden sm:inline">Verificar Resultados Reais</span>
             </button>
            <button 
              onClick={addMatch}
              className="text-xs bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-4 py-2 rounded-full flex items-center gap-1 transition-all border border-emerald-600/50 font-bold"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {matches.map((match, index) => {
            // Logic to verify hit/miss inside the list
            const result = results.find(r => r.id === match.id);
            let statusIcon = null;
            
            // Verifica se tem resultado da IA E placar real completo
            if (result && 
                match.actualHomeScore !== undefined && match.actualHomeScore !== null &&
                match.actualAwayScore !== undefined && match.actualAwayScore !== null) {
               
               const isHit = checkPrediction(result, match.actualHomeScore, match.actualAwayScore);
               
               // Tooltip Content Data
               const tipCode = result.bettingTipCode || '?';
               const tipDesc = getTipDescription(tipCode);
               const actualRes = `${match.actualHomeScore}x${match.actualAwayScore}`;
               
               statusIcon = (
                 <div className="relative group/tooltip cursor-help">
                    {/* The Icon */}
                    {isHit 
                      ? <div className="bg-emerald-500/20 p-1.5 rounded-full text-emerald-500 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]"><Check size={16} strokeWidth={3} /></div> 
                      : <div className="bg-red-500/20 p-1.5 rounded-full text-red-500 border border-red-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.3)]"><X size={16} strokeWidth={3} /></div>
                    }

                    {/* The Detailed Tooltip */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 hidden group-hover/tooltip:block z-50 animate-fade-in">
                       <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl relative">
                          {/* Triangle Arrow */}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 transform rotate-45 -mr-1"></div>
                          
                          <div className={`text-xs font-black uppercase mb-1 ${isHit ? 'text-emerald-400' : 'text-red-400'}`}>
                             {isHit ? 'Acertou!' : 'Errou!'}
                          </div>
                          <div className="space-y-1 text-xs">
                             <div className="flex justify-between text-slate-400">
                               <span>Sua Aposta:</span>
                               <span className="text-white font-bold">{tipCode}</span>
                             </div>
                             <div className="text-[10px] text-slate-500 italic leading-tight mb-2">
                               ({tipDesc})
                             </div>
                             <div className="w-full h-[1px] bg-slate-800"></div>
                             <div className="flex justify-between text-slate-400 pt-1">
                               <span>Placar Real:</span>
                               <span className="text-yellow-500 font-bold font-mono">{actualRes}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               );
            }

            return (
              <div key={match.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors group relative">
                <div className="col-span-1 flex flex-col items-center justify-center gap-1 z-10">
                   <div className="text-slate-600 font-mono text-xs font-bold bg-slate-900 rounded px-1">#{index + 1}</div>
                   {statusIcon}
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input
                    type="text"
                    placeholder="Mandante"
                    className="w-full bg-transparent border-b border-slate-800 px-2 py-1 text-sm text-blue-200 placeholder:text-slate-700 focus:border-blue-500 outline-none text-center font-semibold"
                    value={match.homeTeam}
                    onChange={(e) => updateMatch(match.id, 'homeTeam', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center">
                   <span className="text-slate-700 text-[10px] font-black">X</span>
                   {(match.actualHomeScore !== undefined && match.actualHomeScore !== null) && (
                     <span className="text-[10px] text-yellow-500 font-bold font-mono whitespace-nowrap bg-yellow-500/10 px-1 rounded mt-1">
                       {match.actualHomeScore}-{match.actualAwayScore}
                     </span>
                   )}
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input
                    type="text"
                    placeholder="Visitante"
                    className="w-full bg-transparent border-b border-slate-800 px-2 py-1 text-sm text-red-200 placeholder:text-slate-700 focus:border-red-500 outline-none text-center font-semibold"
                    value={match.awayTeam}
                    onChange={(e) => updateMatch(match.id, 'awayTeam', e.target.value)}
                  />
                </div>
                 <div className="hidden md:block md:col-span-3">
                  <input
                    type="date"
                    className="w-full bg-transparent text-slate-500 text-xs text-center outline-none cursor-pointer"
                    value={match.date}
                    onChange={(e) => updateMatch(match.id, 'date', e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch {
                        // Ignore if not supported
                      }
                    }}
                  />
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-end">
                  <button onClick={() => removeMatch(match.id)} className="text-slate-600 hover:text-red-500 p-2 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
             <div className="text-center text-slate-600 py-12 border-2 border-dashed border-slate-800 rounded-xl">
              <Ticket size={48} className="mx-auto mb-3 opacity-20" />
              Nenhum jogo no bilhete.
            </div>
          )}
        </div>

        {error && <div className="mt-4 text-red-400 text-sm text-center bg-red-950/50 border border-red-900 p-3 rounded-lg">{error}</div>}

        <button
          onClick={handleSimulate}
          disabled={loading || matches.length === 0}
          className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-white/10"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
          PROCESSAR SIMULAÇÃO ({matches.length})
        </button>
      </div>

      {/* Accuracy Stats Header */}
      {results.length > 0 && accuracyStats && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden animate-fade-in-up">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent)] pointer-events-none"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
             <div className="flex items-center gap-4">
                  <div className="bg-yellow-500/20 p-3 rounded-full text-yellow-500 border border-yellow-500/30">
                    <Trophy size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg uppercase tracking-wide">Precisão das Sugestões</h3>
                    <p className="text-slate-400 text-sm">Comparação: Aposta IA vs Resultado Real</p>
                  </div>
              </div>

              <div className="flex justify-around md:justify-center gap-8">
                 <div className="text-center">
                    <div className="text-2xl font-black text-emerald-400">{accuracyStats.hits}</div>
                    <div className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-wider">Acertos</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl font-black text-red-400">{accuracyStats.misses}</div>
                    <div className="text-[10px] text-red-500/70 uppercase font-bold tracking-wider">Erros</div>
                 </div>
              </div>

              <div className="text-center md:text-right bg-slate-950/30 p-4 rounded-xl border border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Aproveitamento</div>
                <div className="text-4xl font-mono font-bold text-white tracking-tighter flex items-center justify-center md:justify-end gap-2">
                  {accuracyStats.percentage}% <TrendingUp size={24} className={accuracyStats.percentage > 50 ? 'text-emerald-500' : 'text-red-500'}/>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((res, idx) => {
               const matchInput = matches.find(m => m.id === res.id);
               let cardBgClass = "bg-slate-900 border-slate-800";
               let hasResult = matchInput && typeof matchInput.actualHomeScore === 'number';
               
               if (hasResult) {
                  const actualHome = matchInput!.actualHomeScore!;
                  const actualAway = matchInput!.actualAwayScore!;
                  const isHit = checkPrediction(res, actualHome, actualAway);
                  if (isHit) {
                    cardBgClass = "bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]";
                  } else {
                    cardBgClass = "bg-amber-950/80 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]";
                  }
               }

               return (
                  <div key={res.id || idx} className={`${cardBgClass} rounded-xl p-0 border shadow-lg overflow-hidden flex flex-col hover:border-opacity-100 transition-all duration-300 group relative`}>
                    
                    {/* Card Header */}
                    <div className="bg-black/30 px-4 py-2 flex justify-between items-center border-b border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jogo {res.id}</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-white/10"></div>
                        <div className="w-2 h-2 rounded-full bg-white/10"></div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-left max-w-[40%]">
                              <div className="font-bold text-white leading-tight">{res.homeTeam}</div>
                              <div className="text-[10px] text-blue-400 font-bold mt-1">{res.homeWinProb}%</div>
                            </div>
                            <div className="text-xs font-black text-slate-500/80">VS</div>
                            <div className="text-right max-w-[40%]">
                              <div className="font-bold text-white leading-tight">{res.awayTeam}</div>
                              <div className="text-[10px] text-red-400 font-bold mt-1">{res.awayWinProb}%</div>
                            </div>
                        </div>

                        {/* Prob Bar */}
                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-800 mb-4 border border-white/5">
                          <div style={{ width: `${res.homeWinProb}%` }} className="bg-blue-600" />
                          <div style={{ width: `${res.drawProb}%` }} className="bg-slate-500" />
                          <div style={{ width: `${res.awayWinProb}%` }} className="bg-red-600" />
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed italic border-t border-white/10 pt-3 opacity-90">
                          "{res.summary}"
                        </p>

                        {/* Betting Suggestion Tip */}
                        <div className="mt-3 bg-black/20 p-2 rounded border border-dashed border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-1 opacity-10"><Ticket size={24}/></div>
                          <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                              <Lightbulb size={10} /> Sugestão
                          </span>
                          <span className="text-sm font-black text-white uppercase tracking-tight shadow-black drop-shadow-sm">
                            {res.bettingTip || "Aguardando análise..."}
                          </span>
                        </div>

                        {/* Comparison with Real Result */}
                        {getResultBadge(res)}
                    </div>
                  </div>
               );
            })}
          </div>

          {/* Bottom Summary Footer */}
          {accuracyStats && (
            <div className="bg-slate-950/50 rounded-2xl p-8 border border-slate-800 flex flex-col items-center justify-center animate-fade-in-up">
               <h4 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">Resumo da Performance</h4>
               <div className="flex items-center gap-8">
                  <div className="text-center">
                     <div className="text-3xl font-black text-emerald-500">{accuracyStats.hits}</div>
                     <div className="text-[10px] text-slate-500 uppercase font-bold">Acertos</div>
                  </div>
                   <div className="h-12 w-[1px] bg-slate-800"></div>
                   <div className="text-center">
                     <div className="text-5xl font-black text-white">{accuracyStats.percentage}%</div>
                     <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Precisão Global</div>
                  </div>
                  <div className="h-12 w-[1px] bg-slate-800"></div>
                  <div className="text-center">
                     <div className="text-3xl font-black text-red-500">{accuracyStats.misses}</div>
                     <div className="text-[10px] text-slate-500 uppercase font-bold">Erros</div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchMode;
