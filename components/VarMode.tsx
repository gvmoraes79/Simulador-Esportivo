
import React, { useState } from 'react';
import { runVarAnalysis, findMatchesByYear } from '../services/geminiService';
import { VarAnalysisResult, MatchCandidate } from '../types';
import { MonitorPlay, Search, Loader2, AlertTriangle, CheckCircle, XCircle, Flag, ExternalLink, Calendar, ChevronRight, ArrowLeft, Trophy } from 'lucide-react';

const VarMode: React.FC = () => {
  const [step, setStep] = useState<'search' | 'select' | 'result'>('search');
  
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VarAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // STEP 1: Find Matches
  const handleFindMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA || !teamB || !year) return;

    setLoading(true);
    setError(null);
    setCandidates([]);

    try {
      const found = await findMatchesByYear(teamA, teamB, year);
      if (found.length === 0) {
         setError(`Nenhum jogo encontrado entre ${teamA} e ${teamB} em ${year}.`);
      } else if (found.length === 1) {
         // Se só achou 1, já vai direto analisar
         handleAnalyze(found[0]);
      } else {
         // Se achou vários, vai pra seleção
         setCandidates(found);
         setStep('select');
      }
    } catch (err: any) {
      setError(err.message || "Erro ao buscar jogos.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> 3: Analyze Specific Match
  const handleAnalyze = async (match: MatchCandidate) => {
    setLoading(true);
    setError(null);
    setResult(null);
    // Garantir que a ordem Home/Away esteja correta para a análise
    const h = match.homeTeam;
    const a = match.awayTeam;
    const d = match.date;

    try {
      const data = await runVarAnalysis(h, a, d);
      setResult(data);
      setStep('result');
    } catch (err: any) {
      setError(err.message || "Erro ao consultar o VAR.");
      setStep('search'); // Volta pro início se der erro fatal
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
     setStep('search');
     setCandidates([]);
     setResult(null);
     setError(null);
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'CORRECT':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> Decisão Correta</span>;
      case 'ERROR':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><XCircle size={10}/> Erro de Arbitragem</span>;
      default:
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><AlertTriangle size={10}/> Lance Polêmico</span>;
    }
  };

  const getGradeColor = (grade: number) => {
     if (grade >= 8) return "text-emerald-400 border-emerald-500 shadow-emerald-900/50";
     if (grade >= 5) return "text-yellow-400 border-yellow-500 shadow-yellow-900/50";
     return "text-red-500 border-red-500 shadow-red-900/50";
  };

  return (
    <div className="animate-fade-in-up">
       {/* Header Section */}
       <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-slate-800 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
             <div className="bg-cyan-950 p-3 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <MonitorPlay className="text-cyan-400" size={32} />
             </div>
             <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                   Chama o <span className="text-cyan-400">VAR</span>
                </h2>
                <p className="text-slate-400 text-xs font-mono font-bold">Central de Análise de Arbitragem</p>
             </div>
          </div>
          
          {step === 'search' && (
              <form onSubmit={handleFindMatches} className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                 <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Time A</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Flamengo"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                      value={teamA}
                      onChange={e => setTeamA(e.target.value)}
                      required
                    />
                 </div>
                 <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Time B</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Vasco"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                      value={teamB}
                      onChange={e => setTeamB(e.target.value)}
                      required
                    />
                 </div>
                 <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Ano do Jogo</label>
                    <div className="relative">
                       <input 
                         type="number" 
                         className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none font-bold text-center"
                         value={year}
                         onChange={e => setYear(e.target.value)}
                         placeholder="2024"
                         required
                       />
                       <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                    </div>
                 </div>
                 <div className="md:col-span-1 flex items-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                       {loading ? "Buscando..." : "Buscar Jogos"}
                    </button>
                 </div>
              </form>
          )}

          {step === 'select' && (
             <div className="relative z-10 animate-fade-in">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                   <button onClick={reset} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft size={18}/></button>
                   Selecione a partida encontrada:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {candidates.map((match, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleAnalyze(match)}
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-xl text-left transition-all group flex items-center justify-between"
                      >
                         <div>
                            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                               <Trophy size={10} /> {match.competition}
                            </div>
                            <div className="text-white font-bold text-lg mb-1 group-hover:text-cyan-300 transition-colors">
                               {match.homeTeam} <span className="text-slate-500 text-sm mx-1">vs</span> {match.awayTeam}
                            </div>
                            <div className="text-slate-400 text-xs font-mono bg-slate-900 px-2 py-1 rounded w-fit">
                               {match.date} • Placar: {match.score}
                            </div>
                         </div>
                         <ChevronRight className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                      </button>
                   ))}
                </div>
                {loading && (
                   <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
                      <div className="flex flex-col items-center gap-2">
                         <Loader2 className="animate-spin text-cyan-400" size={32} />
                         <span className="text-cyan-200 font-bold text-sm">Analisando Arbitragem...</span>
                      </div>
                   </div>
                )}
             </div>
          )}

          {step === 'result' && (
             <div className="relative z-10 flex items-center gap-2">
                <button onClick={reset} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors">
                   <ArrowLeft size={14} /> Nova Consulta
                </button>
             </div>
          )}
       </div>

       {error && (
          <div className="bg-red-950/50 border border-red-500/50 p-4 rounded-xl text-red-200 text-center mb-8 animate-fade-in">
             <AlertTriangle className="inline mr-2" size={18}/> {error}
          </div>
       )}

       {result && step === 'result' && (
          <div className="animate-fade-in-up space-y-6">
             {/* Referee Card */}
             <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-1 border border-slate-700">
                <div className="bg-slate-950/50 p-6 rounded-[14px] flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                      <div className="bg-slate-800 p-4 rounded-full border border-slate-700">
                         <Flag className="text-slate-300" size={24} />
                      </div>
                      <div>
                         <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Árbitro Principal</div>
                         <h3 className="text-2xl font-black text-white">{result.referee}</h3>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                         <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Avaliação da Crítica</div>
                         <div className="text-slate-300 text-sm italic">"{result.summary.substring(0, 60)}..."</div>
                      </div>
                      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center bg-slate-900 shadow-[0_0_20px_currentColor] ${getGradeColor(result.refereeGrade)}`}>
                         <span className="text-3xl font-black">{result.refereeGrade.toFixed(1)}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Timeline of Incidents */}
             <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 border border-slate-800 relative">
                 <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-tight">
                    <MonitorPlay size={20} className="text-cyan-400"/> Revisão Lance a Lance
                 </h3>

                 {result.incidents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                       <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500/50"/>
                       <p className="font-bold text-lg">Sem polêmicas relevantes encontradas.</p>
                       <p className="text-xs">Aparentemente, a arbitragem passou despercebida neste jogo.</p>
                    </div>
                 ) : (
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                       {result.incidents.map((incident, idx) => (
                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                             {/* Icon Dot */}
                             <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 transform -translate-x-1/2 md:translate-x-[-50%] z-10">
                                <span className="text-[10px] font-bold">{incident.minute}</span>
                             </div>
                             
                             {/* Card Content */}
                             <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-lg ml-auto md:ml-0 md:mr-0 group-hover:border-cyan-500/30 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                   <div className="font-bold text-white text-sm">{incident.description}</div>
                                   {getVerdictBadge(incident.verdict)}
                                </div>
                                <div className="text-slate-400 text-xs italic bg-slate-900/50 p-3 rounded-lg border-l-2 border-cyan-500">
                                   <span className="text-cyan-500 font-bold not-italic">Crítica: </span>
                                   {incident.expertOpinion}
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
             </div>
             
             {/* Sources */}
             <div className="flex flex-wrap gap-2 justify-center">
                {result.sources.map((src, i) => (
                   <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-slate-950 border border-slate-800 text-slate-500 px-3 py-1 rounded-full hover:text-cyan-400 hover:border-cyan-500/50 transition-colors flex items-center gap-1">
                      {src.title} <ExternalLink size={8} />
                   </a>
                ))}
             </div>
          </div>
       )}
    </div>
  );
};

export default VarMode;
