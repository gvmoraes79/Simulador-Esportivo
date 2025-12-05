
import React, { useState, useMemo, useRef } from 'react';
import { BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo } from '../types';
import { runBatchSimulation, fetchLoteriaMatches, checkMatchResults, fetchLoteriaPrizeInfo } from '../services/geminiService';
import RiskSelector from './RiskSelector';
import { Plus, Trash2, Play, Loader2, Download, Search, Ticket, Check, AlertCircle, Trophy, Lightbulb, TrendingUp, RotateCcw, X, Info, Grid3X3, Settings, MessageSquare, FileDown, Banknote, Calculator, AlertTriangle, Cloud, CloudRain, Sun, BarChart2, Users } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
    setProgress({ current: 0, total: matches.length, message: 'Iniciando...' });

    try {
      // 1. Simulação Blind Test (Jogo a Jogo com Progresso)
      const data = await runBatchSimulation(matches, riskLevel, globalObservations, (curr, tot, msg) => {
         setProgress({ current: curr, total: tot, message: msg });
      });
      setResults(data);

      // 2. Se for um concurso específico (Resultados já existem), buscar dados do prêmio
      if (loteriaConcurso) {
         // Mesmo sem placares preenchidos, buscamos a info do concurso para saber estimativa
         const prizeData = await fetchLoteriaPrizeInfo(loteriaConcurso);
         setPrizeInfo(prizeData);
      }

    } catch (e) {
      setError("Erro ao simular em lote. Tente menos jogos ou verifique a conexão.");
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, message: '' });
    }
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

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
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text(`Simulação gerada em ${new Date().toLocaleDateString()}`, margin, pdfHeight - 10);

      pdf.save(`volante-loteria-${loteriaConcurso || 'simulacao'}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const checkPrediction = (res: BatchResultItem, actualHome: number, actualAway: number) => {
    const actualResult = 
      actualHome > actualAway ? '1' :
      actualAway > actualHome ? '2' : 'X';
    
    const tip = res.bettingTipCode ? res.bettingTipCode.toUpperCase() : '';

    if (tip === 'ALL') return true;
    if (tip === '1' && actualResult === '1') return true;
    if (tip === '2' && actualResult === '2') return true;
    if (tip === 'X' && actualResult === 'X') return true;
    if (tip === '1X' && (actualResult === '1' || actualResult === 'X')) return true;
    if (tip === 'X2' && (actualResult === 'X' || actualResult === '2')) return true;
    if (tip === '12' && (actualResult === '1' || actualResult === '2')) return true;

    return false;
  };

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

  const accuracyStats = useMemo(() => {
    if (results.length === 0) return null;

    let hits = 0;
    let misses = 0;
    let totalWithResults = 0;

    results.forEach(res => {
      const matchInput = matches.find(m => m.id === res.id);
      if (matchInput && 
          hasValidScore(matchInput.actualHomeScore) && 
          hasValidScore(matchInput.actualAwayScore)) {
        totalWithResults++;
        if (checkPrediction(res, Number(matchInput.actualHomeScore), Number(matchInput.actualAwayScore))) {
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

  const betCost = useMemo(() => {
    if (results.length === 0) return null;

    let doubles = 0;
    let triples = 0;

    results.forEach(res => {
      const tip = res.bettingTipCode ? res.bettingTipCode.toUpperCase() : '';
      if (['1X', 'X2', '12'].includes(tip)) doubles++;
      if (tip === 'ALL' || tip === '1X2') triples++;
    });

    const unitPrice = 1.50; 
    const combinations = Math.pow(2, doubles) * Math.pow(3, triples);
    const total = combinations * unitPrice;
    
    const isBelowMinimum = total < 3.00;

    return {
      doubles,
      triples,
      combinations,
      total,
      isBelowMinimum
    };
  }, [results]);

  const getResultBadge = (res: BatchResultItem) => {
    const matchInput = matches.find(m => m.id === res.id);
    if (!matchInput || !hasValidScore(matchInput.actualHomeScore) || !hasValidScore(matchInput.actualAwayScore)) return null;

    const actualHome = Number(matchInput.actualHomeScore);
    const actualAway = Number(matchInput.actualAwayScore);
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

  const getWeatherIconMini = (text?: string) => {
      if (!text) return null;
      const t = text.toLowerCase();
      if (t.includes('chuva') || t.includes('rain')) return <CloudRain size={14} className="text-blue-400" />;
      if (t.includes('sol') || t.includes('limpo')) return <Sun size={14} className="text-yellow-400" />;
      return <Cloud size={14} className="text-slate-400" />;
  };

  const getMyPrizeStatus = (hits: number) => {
     if (hits === 14) return { status: "ZONA DE PREMIAÇÃO MÁXIMA", color: "text-emerald-400", bg: "bg-emerald-500/20" };
     if (hits === 13) return { status: "PREMIAÇÃO SECUNDÁRIA", color: "text-blue-400", bg: "bg-blue-500/20" };
     return { status: "FORA DA PREMIAÇÃO", color: "text-slate-400", bg: "bg-slate-800" };
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 
        NOVO PAINEL DE APURAÇÃO INTEGRADO
        Combina acertos do usuário + Dados Oficiais de Premiação
      */}
      {results.length > 0 && accuracyStats && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.6)] relative overflow-hidden mb-8">
           {/* Efeito de Fundo */}
           <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none"></div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 relative z-10">
              
              {/* LADO ESQUERDO: PERFORMANCE DO USUÁRIO */}
              <div className="flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 pb-6 md:pb-0 md:pr-6">
                  <div>
                    <h2 className="text-white font-black text-xl uppercase tracking-wide flex items-center gap-2 mb-2">
                        <Trophy className="text-yellow-500" size={24} /> Desempenho do Bilhete
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
                      
                      <div className="flex flex-col justify-center gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                             {accuracyStats.hits} Acertos
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                             <div className="w-2 h-2 rounded-full bg-red-500"></div>
                             {accuracyStats.misses} Erros
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                             {accuracyStats.percentage}% Precisão
                          </div>
                      </div>
                  </div>
              </div>

              {/* LADO DIREITO: DADOS FINANCEIROS OFICIAIS */}
              <div className="flex flex-col justify-center h-full">
                 <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Banknote size={16} className="text-green-400"/> Rateio Oficial (Concurso {prizeInfo?.concurso || "--"})
                 </h3>
                 
                 {prizeInfo ? (
                    <div className="space-y-3">
                       {/* 14 Pontos */}
                       <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex justify-between items-center group hover:border-emerald-500/30 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 font-bold text-xs group-hover:bg-emerald-500 group-hover:text-black transition-colors">14 Pts</div>
                             <div className="flex flex-col">
                                <span className={`font-black text-lg ${prizeInfo.prize14.includes('ACUMULOU') ? 'text-blue-400' : 'text-white'}`}>
                                   {prizeInfo.prize14}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                   <Users size={10} /> {prizeInfo.winners14} Ganhador(es)
                                </span>
                             </div>
                          </div>
                          {prizeInfo.accumulated && (
                             <div className="text-[9px] font-black text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30">ACUMULOU</div>
                          )}
                       </div>

                       {/* 13 Pontos */}
                       <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400 font-bold text-xs group-hover:bg-blue-500 group-hover:text-black transition-colors">13 Pts</div>
                             <div className="flex flex-col">
                                <span className="font-bold text-white text-base">
                                   {prizeInfo.prize13}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                   <Users size={10} /> {prizeInfo.winners13} Ganhador(es)
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-4 bg-black/20 rounded-xl border border-dashed border-slate-700">
                       <Loader2 size={24} className="animate-spin text-slate-600 mb-2" />
                       <span className="text-xs text-slate-500">Buscando informações oficiais...</span>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

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
            const result = results.find(r => r.id === match.id);
            let statusIcon = null;
            
            // Validação Robusta para Ícone na Lista
            if (result && hasValidScore(match.actualHomeScore) && hasValidScore(match.actualAwayScore)) {
               const isHit = checkPrediction(result, Number(match.actualHomeScore), Number(match.actualAwayScore));
               
               const tipCode = result.bettingTipCode || '?';
               const tipDesc = getTipDescription(tipCode);
               const actualRes = `${match.actualHomeScore}x${match.actualAwayScore}`;
               
               statusIcon = (
                 <div className="relative group/tooltip cursor-help">
                    {isHit 
                      ? <div className="bg-emerald-500/20 p-1.5 rounded-full text-emerald-500 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]"><Check size={16} strokeWidth={3} /></div> 
                      : <div className="bg-red-500/20 p-1.5 rounded-full text-red-500 border border-red-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.3)]"><X size={16} strokeWidth={3} /></div>
                    }
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-56 hidden group-hover/tooltip:block z-50 animate-fade-in">
                       <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl relative">
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
                    value={match.homeTeam || ''}
                    onChange={(e) => updateMatch(match.id, 'homeTeam', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center">
                   <span className="text-slate-700 text-[10px] font-black">X</span>
                   {(hasValidScore(match.actualHomeScore) && hasValidScore(match.actualAwayScore)) && (
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
                    value={match.awayTeam || ''}
                    onChange={(e) => updateMatch(match.id, 'awayTeam', e.target.value)}
                  />
                </div>
                 <div className="hidden md:block md:col-span-3">
                  <input
                    type="date"
                    className="w-full bg-transparent text-slate-500 text-xs text-center outline-none cursor-pointer"
                    value={match.date || ''}
                    onChange={(e) => updateMatch(match.id, 'date', e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch {
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

        <div className="mt-8 pt-6 border-t border-slate-800">
           <div className="flex items-center gap-2 mb-4 text-white font-bold uppercase tracking-wider text-sm">
             <Settings size={16} className="text-slate-400" /> Estratégia de Simulação
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-5 rounded-2xl border border-slate-800/50">
              <div>
                <RiskSelector value={riskLevel} onChange={setRiskLevel} />
              </div>
              
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block text-center md:text-left flex items-center gap-2">
                    <MessageSquare size={14} /> Observações da Rodada
                 </label>
                 <textarea
                   className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-white text-xs font-medium focus:ring-1 focus:ring-slate-500 outline-none resize-none h-24"
                   placeholder="Ex: Muitos jogos na chuva, rodada pós-data FIFA, clássicos regionais..."
                   value={globalObservations}
                   onChange={(e) => setGlobalObservations(e.target.value)}
                 />
              </div>
           </div>
        </div>

        {error && <div className="mt-4 text-red-400 text-sm text-center bg-red-950/50 border border-red-900 p-3 rounded-lg">{error}</div>}

        <button
          onClick={handleSimulate}
          disabled={loading || matches.length === 0}
          className={`w-full mt-6 bg-gradient-to-r text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed border-t border-white/10 ${allGamesHaveResults ? 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500' : 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'}`}
        >
          {loading ? (
             <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> 
                <span className="text-xs font-mono">{progress.message || "PROCESSANDO..."}</span>
                {progress.total > 0 && <span className="bg-black/20 px-2 rounded text-xs">({Math.round((progress.current/progress.total)*100)}%)</span>}
             </div>
          ) : (
            allGamesHaveResults ? <BarChart2 size={18} /> : <Play size={18} fill="currentColor" />
          )}
          {!loading && (allGamesHaveResults ? "SAIBA MINHA MARGEM DE ACERTO" : `PROCESSAR SIMULAÇÃO (${matches.length})`)}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((res, idx) => {
               const matchInput = matches.find(m => m.id === res.id);
               let cardBgClass = "bg-slate-900 border-slate-800";
               let hasResult = matchInput && hasValidScore(matchInput.actualHomeScore) && hasValidScore(matchInput.actualAwayScore);
               
               if (hasResult) {
                  const actualHome = Number(matchInput!.actualHomeScore!);
                  const actualAway = Number(matchInput!.actualAwayScore!);
                  const isHit = checkPrediction(res, actualHome, actualAway);
                  if (isHit) {
                    cardBgClass = "bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]";
                  } else {
                    cardBgClass = "bg-amber-950/80 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]";
                  }
               }

               return (
                  <div key={`result-${res.id}-${idx}`} className={`${cardBgClass} rounded-xl p-0 border shadow-lg overflow-hidden flex flex-col hover:border-opacity-100 transition-all duration-300 group relative transform hover:scale-[1.02] hover:shadow-2xl hover:z-10`}>
                    
                    <div className="bg-black/30 px-4 py-2 flex justify-between items-center border-b border-white/10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jogo {res.id}</span>
                      {res.weatherText && (
                         <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                           {getWeatherIconMini(res.weatherText)}
                           <span>{res.weatherText}</span>
                         </div>
                      )}
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

                        <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-800 mb-4 border border-white/5">
                          <div style={{ width: `${res.homeWinProb}%` }} className="bg-blue-600" />
                          <div style={{ width: `${res.drawProb}%` }} className="bg-slate-500" />
                          <div style={{ width: `${res.awayWinProb}%` }} className="bg-red-600" />
                        </div>

                        {res.statsSummary && (
                           <div className="mb-3 px-2 py-1 bg-black/40 rounded border border-white/5 text-[10px] text-emerald-400 font-mono text-center flex items-center justify-center gap-1">
                              <TrendingUp size={10} /> {res.statsSummary}
                           </div>
                        )}

                        <p className="text-xs text-slate-300 leading-relaxed italic border-t border-white/10 pt-3 opacity-90">
                          "{res.summary}"
                        </p>

                        <div className="mt-3 bg-black/20 p-2 rounded border border-dashed border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-1 opacity-10"><Ticket size={24}/></div>
                          <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                              <Lightbulb size={10} /> Sugestão
                          </span>
                          <span className="text-sm font-black text-white uppercase tracking-tight shadow-black drop-shadow-sm">
                            {res.bettingTip || "Aguardando análise..."}
                          </span>
                        </div>

                        {getResultBadge(res)}
                    </div>
                  </div>
               );
            })}
          </div>

          <div ref={ticketRef} className="mt-12 bg-white rounded-lg overflow-hidden shadow-2xl animate-fade-in-up max-w-4xl mx-auto border-t-8 border-yellow-500">
             <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="bg-slate-800 text-yellow-500 p-2 rounded-lg"><Grid3X3 size={20}/></div>
                   <div>
                      <h4 className="text-slate-800 font-black uppercase tracking-tight text-lg">Volante Virtual Otimizado</h4>
                      <p className="text-slate-500 text-xs font-bold">Resumo visual da sugestão da IA</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={handleDownloadPDF}
                     disabled={isGeneratingPdf}
                     className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                   >
                     {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                     Baixar PDF
                   </button>
                </div>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="bg-slate-5 text-slate-500 text-[10px] uppercase font-bold tracking-wider text-center">
                     <th className="py-2 w-12 border-b border-r border-slate-200">#</th>
                     <th className="py-2 text-left px-4 border-b border-slate-200">Mandante</th>
                     <th className="py-2 w-16 border-b border-l border-slate-200 bg-blue-50/50 text-blue-800">COL 1</th>
                     <th className="py-2 w-16 border-b border-l border-slate-200 bg-slate-100 text-slate-800">COL Meio</th>
                     <th className="py-2 w-16 border-b border-l border-r border-slate-200 bg-red-50/50 text-red-800">COL 2</th>
                     <th className="py-2 text-right px-4 border-b border-slate-200">Visitante</th>
                     {/* COLUNAS DE AUDITORIA VISUAL */}
                     <th className="py-2 w-24 border-b border-l border-slate-200 bg-slate-100 text-slate-700">Placar Real</th>
                     <th className="py-2 w-12 border-b border-l border-slate-200 text-slate-700">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {matches.map((matchInput, index) => {
                     const res = results.find(r => r.id === matchInput.id);
                     if (!res) return null; // Defensive check

                     const tip = res.bettingTipCode ? res.bettingTipCode.toUpperCase() : '';
                     
                     const is1 = tip.includes('1') || tip === 'ALL';
                     const isX = tip.includes('X') || tip === 'ALL';
                     const is2 = tip.includes('2') || tip === 'ALL';

                     const op1 = Math.max(0.2, res.homeWinProb / 100);
                     const opX = Math.max(0.2, res.drawProb / 100);
                     const op2 = Math.max(0.2, res.awayWinProb / 100);

                     // Dados do Placar Real para Comparativo
                     const hasResult = hasValidScore(matchInput.actualHomeScore) && hasValidScore(matchInput.actualAwayScore);
                     let statusIcon = <div className="text-slate-300">-</div>;
                     let scoreText = "--";

                     if (hasResult) {
                        const h = Number(matchInput.actualHomeScore);
                        const a = Number(matchInput.actualAwayScore);
                        scoreText = `${h} x ${a}`;
                        
                        const isHit = checkPrediction(res, h, a);
                        statusIcon = isHit 
                           ? <Check size={18} className="text-emerald-500 mx-auto" strokeWidth={3} />
                           : <X size={18} className="text-red-500 mx-auto" strokeWidth={3} />;
                     }

                     return (
                       <tr key={matchInput.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                         <td className="text-center font-mono text-slate-400 font-bold border-r border-slate-100 py-3">{index + 1}</td>
                         <td className="px-4 font-bold text-slate-800">{res.homeTeam}</td>
                         
                         <td className="border-l border-slate-100 p-1">
                           <div className="w-full h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50 relative overflow-hidden">
                             {is1 && (
                               <div 
                                  className="absolute inset-0 bg-blue-600 flex items-center justify-center text-white"
                                  style={{ opacity: op1 }}
                               >
                               </div>
                             )}
                             {is1 && <span className="relative z-10 text-white font-black drop-shadow-md">X</span>}
                           </div>
                         </td>

                         <td className="border-l border-slate-100 p-1">
                           <div className="w-full h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50 relative overflow-hidden">
                             {isX && (
                               <div 
                                  className="absolute inset-0 bg-slate-500 flex items-center justify-center text-white"
                                  style={{ opacity: opX }}
                               >
                               </div>
                             )}
                             {isX && <span className="relative z-10 text-white font-black drop-shadow-md">X</span>}
                           </div>
                         </td>

                         <td className="border-l border-r border-slate-100 p-1">
                           <div className="w-full h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50 relative overflow-hidden">
                             {is2 && (
                               <div 
                                  className="absolute inset-0 bg-red-600 flex items-center justify-center text-white"
                                  style={{ opacity: op2 }}
                               >
                               </div>
                             )}
                             {is2 && <span className="relative z-10 text-white font-black drop-shadow-md">X</span>}
                           </div>
                         </td>

                         <td className="px-4 text-right font-bold text-slate-800">{res.awayTeam}</td>

                         {/* COLUNAS DE AUDITORIA VISUAL */}
                         <td className="border-l border-slate-200 bg-slate-50 text-center font-mono font-bold text-slate-700">
                           {scoreText}
                         </td>
                         <td className="border-l border-slate-200 text-center">
                           {statusIcon}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
             
             {betCost && (
                <div className={`bg-emerald-50 border-t border-emerald-100 p-4 flex flex-col md:flex-row justify-between items-center gap-4 ${betCost.isBelowMinimum ? 'bg-amber-50 border-amber-100' : ''}`}>
                    <div className="flex items-center gap-4 text-emerald-900">
                        <div className={`p-2 rounded-lg ${betCost.isBelowMinimum ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}><Calculator size={20}/></div>
                        <div className="flex flex-col text-xs font-bold uppercase tracking-wider gap-1">
                           <div>Duplos: <span className="text-emerald-700 bg-white/50 px-1.5 py-0.5 rounded border border-emerald-200">{betCost.doubles}</span></div>
                           <div>Triplos: <span className="text-emerald-700 bg-white/50 px-1.5 py-0.5 rounded border border-emerald-200">{betCost.triples}</span></div>
                        </div>
                    </div>
                    
                    {betCost.isBelowMinimum && (
                       <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold">
                          <AlertTriangle size={14} />
                          Aposta mínima oficial: 1 Duplo (R$ 3,00)
                       </div>
                    )}

                    <div className="flex flex-col items-end">
                       <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Banknote size={14} /> Custo Estimado
                       </div>
                       <div className="text-3xl font-black text-emerald-800 font-mono tracking-tighter">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(betCost.total)}
                       </div>
                       <div className="text-[9px] text-emerald-500 font-bold uppercase">
                          {betCost.combinations} aposta(s) x R$ 1,50
                       </div>
                    </div>
                </div>
             )}

             <div className="bg-slate-50 p-3 text-[10px] text-slate-400 text-center font-mono uppercase border-t border-slate-200">
                Simulação gerada por Inteligência Artificial • {new Date().toLocaleDateString()}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchMode;
