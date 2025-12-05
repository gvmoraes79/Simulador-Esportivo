
import React from 'react';
import { SimulationResult } from '../types';
import { ComparisonRadar, ProbabilityPie, ScoreProbabilitiesChart } from './StatsCharts';
import LineupView from './LineupView';
import { ExternalLink, ShieldAlert, User, History, Target, BarChart, RotateCcw, Lightbulb, Check, AlertCircle, CloudRain, Sun, Cloud, CloudLightning, MapPin, TrendingUp, ArrowUp, Layers } from 'lucide-react';

interface ResultViewProps {
  result: SimulationResult;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, onReset }) => {
  
  const getValidationResult = () => {
    if (!result.actualScore) return { hasResult: false, isCorrect: false };

    const actualH = result.actualScore.home;
    const actualA = result.actualScore.away;
    const actualResult = actualH > actualA ? '1' : actualA > actualH ? '2' : 'X';
    
    const tip = result.bettingTipCode ? result.bettingTipCode.toUpperCase() : '1X2';
    
    let isCorrect = false;
    if (tip === 'ALL') isCorrect = true;
    else if (tip === '1' && actualResult === '1') isCorrect = true;
    else if (tip === '2' && actualResult === '2') isCorrect = true;
    else if (tip === 'X' && actualResult === 'X') isCorrect = true;
    else if (tip === '1X' && (actualResult === '1' || actualResult === 'X')) isCorrect = true;
    else if (tip === 'X2' && (actualResult === 'X' || actualResult === '2')) isCorrect = true;
    else if (tip === '12' && (actualResult === '1' || actualResult === '2')) isCorrect = true;

    return { hasResult: true, isCorrect };
  };

  const { hasResult, isCorrect } = getValidationResult();

  const getValidationBanner = () => {
    if (!hasResult) return null;

    const actualH = result.actualScore!.home;
    const actualA = result.actualScore!.away;

    return (
      <div className={`mb-6 rounded-2xl p-4 border flex items-center justify-between shadow-lg transition-all duration-500 ${isCorrect ? 'bg-emerald-950/80 border-emerald-500/50 shadow-emerald-900/20' : 'bg-amber-950/80 border-amber-500/50 shadow-amber-900/20'}`}>
         <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
               {isCorrect ? <Check size={32} /> : <AlertCircle size={32} />}
            </div>
            <div>
               <h3 className={`text-lg font-black uppercase tracking-wider ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                 {isCorrect ? 'Sugestão Certa' : 'Sugestão Errada'}
               </h3>
               <p className="text-slate-300 text-sm">
                 O placar real foi <span className="text-white font-bold">{actualH} x {actualA}</span>
               </p>
            </div>
         </div>
         <div className="hidden md:block text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">Precisão da Aposta</div>
            <div className={`text-2xl font-mono font-bold ${isCorrect ? 'text-emerald-500' : 'text-amber-500'}`}>
               {isCorrect ? '100%' : '0%'}
            </div>
         </div>
      </div>
    );
  };

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('chuva') || c.includes('rain')) return <CloudRain className="text-blue-400" />;
    if (c.includes('sol') || c.includes('limpo') || c.includes('clear')) return <Sun className="text-yellow-400" />;
    if (c.includes('tempestade') || c.includes('storm')) return <CloudLightning className="text-purple-400" />;
    return <Cloud className="text-slate-400" />;
  };

  const scoreboardBorderClass = hasResult 
    ? (isCorrect ? 'border-emerald-600/50 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'border-amber-600/50 shadow-[0_0_40px_rgba(245,158,11,0.15)]') 
    : 'border-slate-800 shadow-2xl';

  return (
    <div className="space-y-8 animate-fade-in">
      
      {getValidationBanner()}

      {/* Jumbotron / Scoreboard */}
      <div className={`relative bg-black rounded-3xl p-1 overflow-hidden transition-all duration-500 border-4 ${scoreboardBorderClass}`}>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-slate-800/20 to-transparent pointer-events-none"></div>
        
        <div className={`bg-gradient-to-b ${hasResult ? (isCorrect ? 'from-emerald-950/30 to-slate-950' : 'from-amber-950/30 to-slate-950') : 'from-slate-900 to-slate-950'} rounded-[20px] p-6 md:p-10 relative transition-colors duration-500`}>
           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <div className="text-center mb-6">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse uppercase tracking-wider">Ao Vivo • IA Simulation</span>
            <div className="text-slate-500 text-xs font-mono mt-2 uppercase tracking-widest">{result.matchDate}</div>
          </div>

          <div className="flex justify-between items-center relative z-10">
            {/* Home */}
            <div className="flex-1 text-center group">
              <h2 className="text-xl md:text-3xl font-black text-white mb-2 uppercase tracking-tighter group-hover:text-blue-400 transition-colors font-display">{result.homeTeam?.name}</h2>
              <div className="flex justify-center gap-1 mb-4">
                 {result.homeTeam?.recentForm?.map((r, i) => (
                   <div key={i} className={`w-2 h-2 rounded-full ${r === 'V' ? 'bg-emerald-500' : r === 'D' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                 ))}
              </div>
            </div>
            
            {/* Score */}
            <div className="mx-2 md:mx-8 flex flex-col items-center">
               <div className="bg-black border border-slate-800 px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-4 relative">
                  <span className="text-5xl md:text-7xl font-mono font-bold text-yellow-500 tabular-nums tracking-widest drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                    {result.predictedScore?.home ?? 0}
                  </span>
                  <div className="h-8 w-[1px] bg-slate-700"></div>
                  <span className="text-5xl md:text-7xl font-mono font-bold text-yellow-500 tabular-nums tracking-widest drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                    {result.predictedScore?.away ?? 0}
                  </span>
               </div>
               <span className="text-[10px] text-slate-500 mt-2 font-mono uppercase">Placar Estimado</span>
            </div>

            {/* Away */}
            <div className="flex-1 text-center group">
              <h2 className="text-xl md:text-3xl font-black text-white mb-2 uppercase tracking-tighter group-hover:text-red-400 transition-colors font-display">{result.awayTeam?.name}</h2>
              <div className="flex justify-center gap-1 mb-4">
                 {result.awayTeam?.recentForm?.map((r, i) => (
                   <div key={i} className={`w-2 h-2 rounded-full ${r === 'V' ? 'bg-emerald-500' : r === 'D' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Conditions & Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather & Location */}
          <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col justify-between">
             <div className="flex items-start justify-between">
                <div>
                   <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                     <MapPin size={14} className="text-slate-500"/> Local do Jogo
                   </h3>
                   <div className="text-white font-bold text-lg">{result.weather?.location || "Estádio"}</div>
                   
                   {/* PITCH TYPE INDICATOR */}
                   <div className="flex items-center gap-2 mt-2">
                      <div className="bg-slate-800 p-1 rounded text-slate-400"><Layers size={14} /></div>
                      <span className="text-xs font-mono text-slate-300">
                        {result.weather?.pitchType ? result.weather.pitchType : "Gramado: Não ident."}
                      </span>
                   </div>
                </div>
                <div className="bg-slate-800 p-2 rounded-lg">
                   {getWeatherIcon(result.weather?.condition || "")}
                </div>
             </div>
             
             <div className="mt-6 flex items-center gap-4">
                <div className="text-4xl font-light text-white">{result.weather?.temp || "--"}</div>
                <div className="flex flex-col">
                   <div className="text-slate-200 font-medium capitalize">{result.weather?.condition}</div>
                   <div className="text-slate-500 text-xs font-mono">{result.weather?.probability}</div>
                </div>
             </div>
          </div>

          {/* Stats Summary & Aerial Duel */}
          <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm shadow-xl flex flex-col gap-4">
             <div>
                <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-500"/> Estatísticas de Aproveitamento
                </h3>
                <div className="space-y-4">
                    <div>
                        <div className="text-blue-400 text-xs font-bold uppercase mb-1">{result.homeTeam.name}</div>
                        <div className="text-slate-200 text-sm italic border-l-2 border-blue-500 pl-3">
                            "{result.homeTeam.statsText}"
                        </div>
                    </div>
                    <div>
                        <div className="text-red-400 text-xs font-bold uppercase mb-1">{result.awayTeam.name}</div>
                        <div className="text-slate-200 text-sm italic border-l-2 border-red-500 pl-3">
                            "{result.awayTeam.statsText}"
                        </div>
                    </div>
                </div>
             </div>
             
             {/* Aerial Duel Analysis */}
             {result.homeTeam.aerialAttackRating && (
                <div className="border-t border-slate-800 pt-4 mt-2">
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ArrowUp size={14} className="text-slate-500"/> Duelo Aéreo (Escalações)
                    </h3>
                    <div className="space-y-3">
                       {/* Comparativo 1: Ataque Casa vs Defesa Fora */}
                       <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span className="text-blue-400">ATQ {result.homeTeam.name}</span> vs <span className="text-red-400">DEF {result.awayTeam.name}</span>
                       </div>
                       <div className="h-2 flex rounded-full overflow-hidden bg-slate-800">
                           <div style={{ width: `${result.homeTeam.aerialAttackRating}%` }} className="bg-blue-600" title="Ataque Aéreo Mandante"></div>
                           <div className="flex-1 bg-slate-800 border-l border-r border-slate-700"></div>
                           <div style={{ width: `${result.awayTeam.aerialDefenseRating}%` }} className="bg-red-800" title="Defesa Aérea Visitante"></div>
                       </div>
                       
                       {/* Comparativo 2: Defesa Casa vs Ataque Fora */}
                       <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-1">
                          <span className="text-blue-400">DEF {result.homeTeam.name}</span> vs <span className="text-red-400">ATQ {result.awayTeam.name}</span>
                       </div>
                       <div className="h-2 flex rounded-full overflow-hidden bg-slate-800">
                           <div style={{ width: `${result.homeTeam.aerialDefenseRating}%` }} className="bg-blue-800" title="Defesa Aérea Mandante"></div>
                           <div className="flex-1 bg-slate-800 border-l border-r border-slate-700"></div>
                           <div style={{ width: `${result.awayTeam.aerialAttackRating}%` }} className="bg-red-600" title="Ataque Aéreo Visitante"></div>
                       </div>
                    </div>
                </div>
             )}
          </div>
      </div>

      <LineupView lineups={result.lineups} homeTeamName={result.homeTeam?.name} awayTeamName={result.awayTeam?.name} />

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm flex flex-col">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <div className="bg-yellow-500/20 p-1.5 rounded text-yellow-500"><BarChart size={16} /></div>
            Probabilidades (1x2)
          </h3>
          <div className="relative flex-1">
            <ProbabilityPie data={result} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                 <div className="text-xs text-slate-500">Favorito</div>
                 <div className="text-lg font-bold text-white">
                   {result.homeTeam?.winProbability > result.awayTeam?.winProbability ? result.homeTeam?.name : result.awayTeam?.name}
                 </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
               <Lightbulb size={20} />
            </div>
            <div className="flex-1 z-10">
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Sugestão de Aposta</div>
              <div className="text-sm font-black text-white">{result.bettingTip || "Análise indisponível"}</div>
            </div>
             <div className="absolute -right-4 -top-4 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors transform rotate-12">
               <Target size={60} />
             </div>
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 backdrop-blur-sm">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <div className="bg-emerald-500/20 p-1.5 rounded text-emerald-500"><Target size={16} /></div>
            Placares Prováveis
          </h3>
          <ScoreProbabilitiesChart data={result} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900/80 rounded-2xl p-6 border border-slate-800">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
             <div className="bg-indigo-500/20 p-1.5 rounded text-indigo-500"><ShieldAlert size={16} /></div>
             Raio-X Tático
          </h3>
          <ComparisonRadar data={result} />
        </div>
        
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
             <BarChart size={120} />
          </div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 relative z-10">
             Analista Virtual
          </h3>
          <div className="prose prose-invert prose-sm max-w-none relative z-10">
            <p className="text-slate-300 leading-relaxed text-base whitespace-pre-line border-l-4 border-emerald-500 pl-4 bg-black/20 p-4 rounded-r-lg">
              {result.analysisText}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
          <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2 uppercase text-sm tracking-wider">
            <User size={16}/> Key Players: {result.homeTeam?.name}
          </h4>
          <div className="space-y-3">
            {result.homeTeam?.keyPlayers?.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
                <div className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-blue-900 group-hover:text-blue-200 transition-colors">
                   {p.position.substring(0,2)}
                </div>
                <div className="flex-1">
                  <div className="text-slate-200 font-bold text-sm">{p.name}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{p.condition}</div>
                </div>
                <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg font-mono font-bold text-lg border border-blue-500/20">
                  {p.rating}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
          <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 uppercase text-sm tracking-wider">
            <User size={16}/> Key Players: {result.awayTeam?.name}
          </h4>
          <div className="space-y-3">
            {result.awayTeam?.keyPlayers?.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-red-500/50 transition-colors group">
                <div className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-red-900 group-hover:text-red-200 transition-colors">
                   {p.position.substring(0,2)}
                </div>
                <div className="flex-1">
                  <div className="text-slate-200 font-bold text-sm">{p.name}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-bold">{p.condition}</div>
                </div>
                <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg font-mono font-bold text-lg border border-red-500/20">
                  {p.rating}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 text-xs">
           {result.sources?.length > 0 && result.sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-full text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors border border-slate-800"
              >
                <History size={10} /> {source.title.substring(0, 20)}... <ExternalLink size={10} />
              </a>
           ))}
        </div>
        
        <button
          onClick={onReset}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-200 flex items-center gap-2 border border-slate-700 hover:border-slate-500 shadow-lg"
        >
          <RotateCcw size={18} /> Nova Simulação
        </button>
      </div>
    </div>
  );
};

export default ResultView;
