import React, { useState, useMemo, useRef } from 'react';
import { BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo } from '../types';
import { runBatchSimulation, fetchLoteriaMatches, checkMatchResults, fetchLoteriaPrizeInfo } from '../services/geminiService';
import RiskSelector from './RiskSelector';
import { Plus, Trash2, Play, Loader2, Download, Search, Ticket, Check, AlertCircle, Trophy, Lightbulb, TrendingUp, RotateCcw, X, Info, Grid3X3, Settings, MessageSquare, FileDown, Banknote, Calculator, AlertTriangle, Cloud, CloudRain, Sun, BarChart2, Users, Wand2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// LOGIC: Calculate Strategy locally based on probabilities AND Zebra Level
const calculateStrategy = (
  homeProb: number, 
  drawProb: number, 
  awayProb: number, 
  risk: RiskLevel,
  zebraLevel: number = 0
): { code: string, tip: string } => {
  
  // 1. Aplicar Fator Zebra (Chaos Math)
  let h = homeProb;
  let d = drawProb;
  let a = awayProb;

  if (zebraLevel > 0) {
      const chaosFactor = zebraLevel / 10; // 0.1 a 1.0 (Máximo)
      
      // Diferença entre os times
      const gap = Math.abs(h - a);
      
      // Equalização: Reduz a vantagem do favorito
      const equalization = gap * (chaosFactor * 0.9); // Até 90% da vantagem é comida pela zebra

      if (h > a) {
          h -= equalization;
          a += (equalization * 0.5); // Azarão ganha força
          d += (equalization * 0.5); // Empate ganha força
      } else {
          a -= equalization;
          h += (equalization * 0.5);
          d += (equalization * 0.5);
      }

      // Zebra Extrema (8, 9, 10): Inverte tendências e força empates
      if (zebraLevel >= 8) {
          const randomBoost = (zebraLevel - 7) * 5; // +5%, +10%, +15%
          d += randomBoost;
          h -= (randomBoost / 2);
          a -= (randomBoost / 2);
      }
  }

  // Recalcula favorito baseado nos novos números "Zebrados"
  const diff = h - a;
  const absDiff = Math.abs(diff);
  const favorite = diff > 0 ? 'HOME' : 'AWAY';
  const favProb = Math.max(h, a);

  // Strategy Matrix (Usando probabilidades ajustadas pela Zebra)
  switch (risk) {
    case RiskLevel.CONSERVATIVE:
      // Safety first: Double Chance if favorite isn't overwhelming
      if (favProb > 65) return { code: favorite === 'HOME' ? '1' : '2', tip: 'Favorito Claro' };
      if (favorite === 'HOME') return { code: '1X', tip: 'Casa ou Empate' };
      return { code: 'X2', tip: 'Visitante ou Empate' };

    case RiskLevel.CALCULATED:
      // Smart Value: Single bet if prob > 50, else cover draw
      if (favProb > 55) return { code: favorite === 'HOME' ? '1' : '2', tip: 'Valor no Favorito' };
      if (diff > 0) return { code: '1X', tip: 'Proteção Empate' };
      return { code: 'X2', tip: 'Proteção Empate' };

    case RiskLevel.MODERATE:
      // Standard: Single bet if prob > 45. Draw if balanced.
      if (absDiff < 10 && d > 30) return { code: 'X', tip: 'Jogo Equilibrado' };
      if (favProb > 45) return { code: favorite === 'HOME' ? '1' : '2', tip: 'Aposta Seca' };
      return { code: favorite === 'HOME' ? '1X' : 'X2', tip: 'Dupla Chance' };

    case RiskLevel.AGGRESSIVE:
      // Aggressive: Ignore draws unless huge probability. Hunt away wins.
      if (favorite === 'AWAY' && favProb > 35) return { code: '2', tip: 'Visitante (Valor)' };
      if (favorite === 'HOME' && favProb > 50) return { code: '1', tip: 'Mandante' };
      return { code: '12', tip: 'Sem Empate' };

    case RiskLevel.BOLD:
      // Zebra Hunter: Bet on Draw or Underdog if odds allow
      if (absDiff < 15) return { code: 'X', tip: 'Cravar Empate' };
      if (favorite === 'HOME' && a > 20) return { code: 'X2', tip: 'Zebra Visitante' };
      if (favorite === 'AWAY' && h > 20) return { code: '1X', tip: 'Zebra Casa' };
      return { code: favorite === 'HOME' ? '1' : '2', tip: 'Favorito Absoluto' };
      
    default:
      return { code: '1X2', tip: 'Triplo' };
  }
};

const BatchMode: React.FC = () => {
  const [matches, setMatches] = useState<BatchMatchInput[]>([
    { id: '1', homeTeam: '', awayTeam: '', date: new Date().toISOString().split('T')[0] }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingLoteria, setLoadingLoteria] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [results, setResults] = useState<BatchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loteriaConcurso, setLoteriaConcurso] = useState('');
  const [prizeInfo, setPrizeInfo] = useState<LoteriaPrizeInfo | null>(null);
  
  const [progress, setProgress] = useState<{ current: number, total: number, message: string }>({ current: 0, total: 0, message: '' });

  const ticketRef = useRef<HTMLDivElement>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(RiskLevel.MODERATE);
  const [zebraLevel, setZebraLevel] = useState<number>(0); // 0 a 10
  const [globalObservations, setGlobalObservations] = useState('');

  const hasValidScore = (score: number | string | undefined | null) => {
    if (score === undefined || score === null || score === '') return false;
    const num = Number(score);
    return !isNaN(num);
  };

  const allGamesHaveResults = useMemo(() => {
     return matches.length > 0 && matches.every(m => 
       hasValidScore(m.actualHomeScore) && hasValidScore(m.actualAwayScore)
     );
  }, [matches]);

  const addMatch = () => {
    const lastId = matches.length > 0 ? parseInt(matches[matches.length - 1].id, 10) : 0;
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
    setPrizeInfo(null);
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
    setPrizeInfo(null);
    setProgress({ current: 0, total: matches.length, message: 'Iniciando modo de alta eficiência...' });

    try {
      const data = await runBatchSimulation(matches, riskLevel, globalObservations, (curr, tot, msg) => {
         setProgress({ current: curr, total: tot, message: msg });
      });
      setResults(data);

      if (loteriaConcurso) {
         const prizeData = await fetchLoteriaPrizeInfo(loteriaConcurso);
         setPrizeInfo(prizeData);
      }

    } catch (e) {
      setError("Erro ao simular. Verifique conexão.");
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, message: '' });
    }
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const margin = 10;
      const finalImgWidth = pdfWidth - (margin * 2);
      const finalImgHeight = (imgHeight * finalImgWidth) / imgWidth;
      pdf.addImage(imgData, 'PNG', margin, margin, finalImgWidth, finalImgHeight);
      pdf.save(`volante-loteria-${loteriaConcurso || 'simulacao'}.pdf`);
    } catch (err) {
      setError("Não foi possível gerar o PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const checkPrediction = (res: BatchResultItem, actualHome: number, actualAway: number, specificTipCode?: string) => {
    const actualResult = actualHome > actualAway ? '1' : actualAway > actualHome ? '2' : 'X';
    
    let tip = specificTipCode ? specificTipCode.toUpperCase() : '';
    
    // Se não veio código específico, calcular agora baseado no risco atual e nas probs + ZEBRA
    if (!tip) {
       const calculated = calculateStrategy(res.homeWinProb, res.drawProb, res.awayWinProb, riskLevel, zebraLevel);
       tip = calculated.code;
    }

    if (tip === 'ALL') return true;
    if (tip === '1' && actualResult === '1') return true;
    if (tip === '2' && actualResult === '2') return true;
    if (tip === 'X' && actualResult === 'X') return true;
    if (tip === '1X' && (actualResult === '1' || actualResult === 'X')) return true;
    if (tip === 'X2' && (actualResult === 'X' || actualResult === '2')) return true;
    if (tip === '12' && (actualResult === '1' || actualResult === '2')) return true;
    return false;
  };

  const accuracyStats = useMemo(() => {
    if (results.length === 0) return null;
    let hits = 0;
    let misses = 0;
    let totalWithResults = 0;

    results.forEach(res => {
      const matchInput = matches.find(m => m.id === res.id);
      if (matchInput && hasValidScore(matchInput.actualHomeScore) && hasValidScore(matchInput.actualAwayScore)) {
        totalWithResults++;
        // Calculate dynamic strategy WITH ZEBRA
        const strategy = calculateStrategy(res.homeWinProb, res.drawProb, res.awayWinProb, riskLevel, zebraLevel);
        if (checkPrediction(res, Number(matchInput.actualHomeScore), Number(matchInput.actualAwayScore), strategy.code)) {
          hits++;
        } else {
          misses++;
        }
      }
    });

    if (totalWithResults === 0) return null;
    return { hits, misses, total: totalWithResults, percentage: Math.round((hits / totalWithResults) * 100) };
  }, [results, matches, riskLevel, zebraLevel]);

  // Strategy Scores for Selector
  const strategyScores = useMemo(() => {
    if (results.length === 0) return null;
    const scores: Record<string, number> = {};
    const riskLevels = Object.values(RiskLevel);

    riskLevels.forEach(level => {
        let hits = 0;
        results.forEach(res => {
           const matchInput = matches.find(m => m.id === res.id);
           if (matchInput && hasValidScore(matchInput.actualHomeScore) && hasValidScore(matchInput.actualAwayScore)) {
                 // WITH ZEBRA
                 const strategy = calculateStrategy(res.homeWinProb, res.drawProb, res.awayWinProb, level, zebraLevel);
                 if (checkPrediction(res, Number(matchInput.actualHomeScore), Number(matchInput.actualAwayScore), strategy.code)) {
                    hits++;
                 }
           }
        });
        scores[level] = hits;
    });
    const hasAnyResult = matches.some(m => hasValidScore(m.actualHomeScore));
    return hasAnyResult ? scores : null;
  }, [results, matches, zebraLevel]);

  const betCost = useMemo(() => {
    if (results.length === 0) return null;
    let doubles = 0;
    let triples = 0;

    results.forEach(res => {
      // WITH ZEBRA
      const strategy = calculateStrategy(res.homeWinProb, res.drawProb, res.awayWinProb, riskLevel, zebraLevel);
      const tip = strategy.code;
      if (['1X', 'X2', '12'].includes(tip)) doubles++;
      if (tip === 'ALL' || tip === '1X2') triples++;
    });

    const unitPrice = 1.50; 
    const combinations = Math.pow(2, doubles) * Math.pow(3, triples);
    const total = combinations * unitPrice;
    return { doubles, triples, combinations, total, isBelowMinimum: total < 3.00 };
  }, [results, riskLevel, zebraLevel]);

  const getMyPrizeStatus = (hits: number) => {
     if (hits === 14) return { status: "PREMIAÇÃO MÁXIMA", color: "text-emerald-400", bg: "bg-emerald-500/20" };
     if (hits === 13) return { status: "PREMIAÇÃO SECUNDÁRIA", color: "text-blue-400", bg: "bg-blue-500/20" };
     return { status: "FORA DA PREMIAÇÃO", color: "text-slate-400", bg: "bg-slate-800" };
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {results.length > 0 && accuracyStats && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.6)] relative overflow-hidden mb-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 relative z-10">
              <div className="flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-6">
                  <div>
                    <h2 className="text-white font-black text-xl uppercase tracking-wide flex items-center gap-2 mb-2">
                        <Trophy className="text-yellow-500" size={24} /> Desempenho ({riskLevel})
                    </h2>
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider w-fit border border-white/10 ${getMyPrizeStatus(accuracyStats.hits).bg} ${getMyPrizeStatus(accuracyStats.hits).color}`}>
                        {getMyPrizeStatus(accuracyStats.hits).status}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-black/40 p-4 rounded-xl border border-white/10 min-w-[120px]">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Pontos</div>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-5xl font-black tracking-tighter ${accuracyStats.hits >= 13 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'text-white'}`}>
                            {accuracyStats.hits}
                            </span>
                            <span className="text-sm font-bold text-slate-600">/ 14</span>
                        </div>
                      </div>
                  </div>
              </div>
              <div className="flex flex-col justify-center h-full">
                 <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Banknote size={16} className="text-green-400"/> Rateio Oficial (Concurso {prizeInfo?.concurso || "--"})
                 </h3>
                 {prizeInfo ? (
                    <div className="space-y-3">
                       <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                             <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 font-bold text-xs">14 Pts</div>
                             <div className="flex flex-col">
                                <span className="font-black text-lg text-white">{prizeInfo.prize14}</span>
                                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><Users size={10} /> {prizeInfo.winners14} Ganhador(es)</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="text-xs text-slate-500 italic">Buscando dados oficiais...</div>
                 )}
              </div>
           </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
           <Download size={18} className="text-yellow-500" /> Importar Concurso
        </h3>
        <div className="flex gap-3">
          <input 
            type="number" 
            placeholder="Nº Concurso"
            className="flex-1 bg-black/40 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-500"
            value={loteriaConcurso}
            onChange={(e) => setLoteriaConcurso(e.target.value)}
          />
          <button 
            onClick={handleFetchLoteria}
            disabled={loadingLoteria || !loteriaConcurso}
            className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg"
          >
            {loadingLoteria ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            Buscar
          </button>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase">
            <Ticket className="text-emerald-400" /> Bilhete de Jogos
          </h2>
          <div className="flex gap-2">
             <button onClick={handleUpdateResults} disabled={loadingResults || matches.length === 0} className="text-xs bg-slate-800 text-blue-400 px-4 py-2 rounded-full border border-slate-700 font-bold">
                {loadingResults ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                <span className="hidden sm:inline ml-1">Atualizar Placares</span>
             </button>
            <button onClick={addMatch} className="text-xs bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-full border border-emerald-600/50 font-bold">
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {matches.map((match, index) => {
            const result = results.find(r => r.id === match.id);
            let statusIcon = null;
            if (result && hasValidScore(match.actualHomeScore) && hasValidScore(match.actualAwayScore)) {
               // WITH ZEBRA
               const calculated = calculateStrategy(result.homeWinProb, result.drawProb, result.awayWinProb, riskLevel, zebraLevel);
               const isHit = checkPrediction(result, Number(match.actualHomeScore), Number(match.actualAwayScore), calculated.code);
               
               statusIcon = isHit 
                 ? <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-500"><Check size={14} /></div> 
                 : <div className="bg-red-500/20 p-1 rounded-full text-red-500"><X size={14} /></div>;
            }

            return (
              <div key={match.id} className="grid grid-cols-12 gap-2 items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                   <div className="text-slate-600 font-mono text-xs">#{index + 1}</div>
                   {statusIcon}
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input
                    type="text"
                    placeholder="Mandante"
                    className="w-full bg-transparent border-b border-slate-800 px-2 py-1 text-sm text-blue-200 text-center font-bold"
                    value={match.homeTeam || ''}
                    onChange={(e) => updateMatch(match.id, 'homeTeam', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center">
                   <span className="text-slate-700 text-[10px]">X</span>
                   {(hasValidScore(match.actualHomeScore)) && (
                     <span className="text-cyan-500 font-bold bg-cyan-500/10 px-1 rounded mt-1">
                       {match.actualHomeScore}-{match.actualAwayScore}
                     </span>
                   )}
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input
                    type="text"
                    placeholder="Visitante"
                    className="w-full bg-transparent border-b border-slate-800 px-2 py-1 text-sm text-red-200 text-center font-bold"
                    value={match.awayTeam || ''}
                    onChange={(e) => updateMatch(match.id, 'awayTeam', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeMatch(match.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
                <div className="col-span-12 md:col-span-2">
                    <input
                        type="date"
                        className="w-full bg-transparent border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-500 text-center cursor-pointer [color-scheme:dark]"
                        value={match.date}
                        onChange={(e) => updateMatch(match.id, 'date', e.target.value)}
                        onFocus={(e) => e.target.showPicker()}
                    />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-5 rounded-2xl border border-slate-800/50">
              <div className="space-y-6">
                <RiskSelector 
                  value={riskLevel} 
                  onChange={setRiskLevel} 
                  scores={strategyScores}
                  totalPoints={matches.length}
                />
                
                {/* ZEBRA LEVEL SLIDER */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="text-2xl">🦓</span> Nível Zebra
                         </label>
                         <span className={`text-xs font-mono font-black px-3 py-1 rounded-full ${zebraLevel === 0 ? 'bg-slate-800 text-slate-500' : zebraLevel > 7 ? 'bg-red-500 text-white shadow-red-900/50 shadow-lg' : 'bg-yellow-500 text-black shadow-yellow-900/50 shadow-lg'}`}>
                             {zebraLevel}/10
                         </span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="1" 
                        value={zebraLevel}
                        onChange={(e) => setZebraLevel(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                    />
                    <div className="flex justify-between mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-wide px-1">
                        <span>Lógica Pura</span>
                        <span>Caos Total</span>
                    </div>
                    <div className="mt-3 text-[10px] text-slate-400 italic text-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                        {zebraLevel === 0 && "O sistema respeita 100% as probabilidades estatísticas."}
                        {zebraLevel > 0 && zebraLevel <= 4 && "Suaviza favoritismos claros, aumentando chance de empates."}
                        {zebraLevel > 4 && zebraLevel <= 7 && "Equilibra o jogo: zebras têm chances reais de vitória."}
                        {zebraLevel > 7 && "Modo Caos: Inverte lógicas e busca resultados improváveis de alto risco."}
                    </div>
                </div>
              </div>
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Observações Globais</label>
                 <textarea
                   className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-white text-xs h-32 resize-none focus:ring-2 focus:ring-emerald-500/50 outline-none"
                   placeholder="Ex: Rodada com muitos clássicos, gramados molhados..."
                   value={globalObservations}
                   onChange={(e) => setGlobalObservations(e.target.value)}
                 />
              </div>
           </div>
        </div>

        {error && <div className="mt-4 text-red-400 text-sm text-center bg-red-950/50 p-3 rounded">{error}</div>}

        <button
          onClick={handleSimulate}
          disabled={loading || matches.length === 0}
          className={`w-full mt-6 bg-gradient-to-r text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${allGamesHaveResults ? 'from-blue-600 to-indigo-600' : 'from-emerald-600 to-teal-600'}`}
        >
          {loading ? (
             <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> 
                <span className="text-xs">{progress.message || "PROCESSANDO..."}</span>
             </div>
          ) : (
            allGamesHaveResults ? "SAIBA MINHA MARGEM DE ACERTO" : `PROCESSAR SIMULAÇÃO`
          )}
        </button>
      </div>

      {results.length > 0 && (
          <div ref={ticketRef} className="mt-12 bg-white rounded-lg overflow-hidden shadow-2xl max-w-4xl mx-auto border-t-8 border-yellow-500">
             <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="bg-slate-800 text-yellow-500 p-2 rounded-lg"><Grid3X3 size={20}/></div>
                   <div>
                      <h4 className="text-slate-800 font-black uppercase text-lg">Volante Otimizado ({riskLevel})</h4>
                      {zebraLevel > 0 && (
                          <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded ml-2 font-bold">🦓 Zebra Lv.{zebraLevel}</span>
                      )}
                   </div>
                </div>
                <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-2 hover:bg-slate-700">
                  {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
                </button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold text-center border-b border-slate-200">
                     <th className="py-3 w-12">#</th>
                     <th className="py-3 text-left px-4">Mandante</th>
                     <th className="py-3 w-16 bg-blue-50/50 border-l border-slate-200 text-blue-800">1</th>
                     <th className="py-3 w-16 bg-slate-100 border-l border-slate-200 text-slate-800">X</th>
                     <th className="py-3 w-16 bg-red-50/50 border-l border-slate-200 text-red-800">2</th>
                     <th className="py-3 text-right px-4 border-l border-slate-200">Visitante</th>
                     <th className="py-3 w-24 bg-slate-100 border-l border-slate-200">Real</th>
                     <th className="py-3 w-12 border-l border-slate-200">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {matches.map((matchInput, index) => {
                     const res = results.find(r => r.id === matchInput.id);
                     if (!res) return null;

                     // Calc Strategy Locally WITH ZEBRA
                     const strategy = calculateStrategy(res.homeWinProb, res.drawProb, res.awayWinProb, riskLevel, zebraLevel);
                     const tip = strategy.code;
                     
                     const is1 = tip.includes('1') || tip === 'ALL';
                     const isX = tip.includes('X') || tip === 'ALL';
                     const is2 = tip.includes('2') || tip === 'ALL';

                     const op1 = Math.max(0.2, res.homeWinProb / 100);
                     const opX = Math.max(0.2, res.drawProb / 100);
                     const op2 = Math.max(0.2, res.awayWinProb / 100);

                     const hasResult = hasValidScore(matchInput.actualHomeScore) && hasValidScore(matchInput.actualAwayScore);
                     let statusIcon = <span className="text-slate-300">-</span>;
                     let scoreText = "--";

                     if (hasResult) {
                        const h = Number(matchInput.actualHomeScore);
                        const a = Number(matchInput.actualAwayScore);
                        scoreText = `${h} x ${a}`;
                        const isHit = checkPrediction(res, h, a, tip);
                        statusIcon = isHit ? <Check size={20} className="text-emerald-500 mx-auto drop-shadow-sm" strokeWidth={3} /> : <X size={20} className="text-red-500 mx-auto drop-shadow-sm" strokeWidth={3} />;
                     }

                     return (
                       <tr key={matchInput.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                         <td className="text-center font-mono text-slate-400 font-bold py-3">{index + 1}</td>
                         <td className="px-4 font-bold text-slate-800">{res.homeTeam}</td>
                         <td className="p-1 border-l border-slate-100"><div className="w-full h-8 flex items-center justify-center rounded border border-slate-200 bg-white relative overflow-hidden shadow-sm">{is1 && <div className="absolute inset-0 bg-blue-600 flex items-center justify-center text-white font-black" style={{ opacity: Math.max(0.4, op1) }}>X</div>}</div></td>
                         <td className="p-1 border-l border-slate-100"><div className="w-full h-8 flex items-center justify-center rounded border border-slate-200 bg-white relative overflow-hidden shadow-sm">{isX && <div className="absolute inset-0 bg-slate-500 flex items-center justify-center text-white font-black" style={{ opacity: Math.max(0.4, opX) }}>X</div>}</div></td>
                         <td className="p-1 border-l border-slate-100"><div className="w-full h-8 flex items-center justify-center rounded border border-slate-200 bg-white relative overflow-hidden shadow-sm">{is2 && <div className="absolute inset-0 bg-red-600 flex items-center justify-center text-white font-black" style={{ opacity: Math.max(0.4, op2) }}>X</div>}</div></td>
                         <td className="px-4 text-right font-bold text-slate-800 border-l border-slate-100">{res.awayTeam}</td>
                         <td className="bg-slate-50 text-center font-mono font-bold text-slate-700 border-l border-slate-200">{scoreText}</td>
                         <td className="text-center border-l border-slate-200">{statusIcon}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
             
             {betCost && (
                <div className={`bg-emerald-50 border-t border-emerald-100 p-6 flex justify-between items-center ${betCost.isBelowMinimum ? 'bg-amber-50 border-amber-100' : ''}`}>
                    <div className="flex flex-col text-xs font-bold uppercase tracking-wider gap-1 text-emerald-900">
                       <div className="flex gap-4">
                          <span>Duplos: <span className="text-lg">{betCost.doubles}</span></span>
                          <span>Triplos: <span className="text-lg">{betCost.triples}</span></span>
                       </div>
                       {betCost.isBelowMinimum && <div className="text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle size={12}/> Aposta mínima não atingida (R$ 3,00)</div>}
                    </div>
                    <div className="flex flex-col items-end">
                       <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Custo Estimado da Aposta</div>
                       <div className="text-4xl font-black text-emerald-800 font-mono tracking-tighter">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(betCost.total)}
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
