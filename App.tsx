
import React, { useState, useEffect } from 'react';
import { MatchInput, TeamMood, SimulationResult, RiskLevel } from './types';
import MoodSelector from './components/MoodSelector';
import ResultView from './components/ResultView';
import BatchMode from './components/BatchMode';
import HistoryMode from './components/HistoryMode'; 
import VarMode from './components/VarMode'; 
import RiskSelector from './components/RiskSelector';
import { runSimulation } from './services/geminiService'; 
import { authService } from './services/authService'; 
import { Loader2, Activity, Trophy, History, MonitorPlay, LogOut, Share2, Check } from 'lucide-react';
import LoginScreen from './components/LoginScreen';

const CACHE_KEY = 'sportsim_last_result';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch' | 'history' | 'var'>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [initialInvite, setInitialInvite] = useState('');

  const [input, setInput] = useState<MatchInput>({
    homeTeamName: '', awayTeamName: '', date: new Date().toISOString().split('T')[0],
    homeMood: TeamMood.REGULAR, awayMood: TeamMood.REGULAR, riskLevel: RiskLevel.MODERATE
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) setInitialInvite(invite);
    
    if (authService.checkSession()) {
      setIsAuthenticated(true);
      // Restaurar última simulação
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setResult(JSON.parse(cached));
    }
  }, []);

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?invite=VIP_2024`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await runSimulation(input);
      setResult(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e: any) {
      alert(e.message || "Erro na simulação.");
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setResult(null);
    localStorage.removeItem(CACHE_KEY);
  };

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} initialInviteCode={initialInvite} />;

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md h-20 flex items-center justify-between px-6 shadow-xl">
        <div className="flex items-center gap-3">
           <Trophy className="text-emerald-500" size={28} />
           <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
             SportSim <span className="text-emerald-500">Pro</span>
           </h1>
        </div>

        <nav className="hidden md:flex bg-slate-950 p-1 rounded-full border border-slate-800 shadow-inner">
          {[
            { id: 'single', label: 'Simulador', icon: Activity },
            { id: 'batch', label: 'Loteca', icon: Trophy },
            { id: 'history', label: 'Histórico', icon: History },
            { id: 'var', label: 'VAR', icon: MonitorPlay }
          ].map(t => (
            <button key={t.id} onClick={() => { setMode(t.id as any); }} className={`px-5 py-2 rounded-full text-xs font-bold uppercase flex items-center gap-2 transition-all ${mode === t.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
           <button onClick={handleShare} className="bg-slate-800 p-2.5 rounded-xl text-slate-300 hover:text-white transition-colors border border-slate-700">
              {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
           </button>
           <button onClick={() => { authService.logout(); window.location.reload(); }} className="bg-slate-800 p-2.5 rounded-xl text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700">
              <LogOut size={20}/>
           </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 py-10">
        {mode === 'single' && (
          !result ? (
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSimulate} className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border border-slate-800 space-y-8 shadow-2xl animate-fade-in-up">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mandante</label>
                      <input type="text" placeholder="Time A" className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center font-black text-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={input.homeTeamName} onChange={e => setInput({...input, homeTeamName: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Visitante</label>
                      <input type="text" placeholder="Time B" className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center font-black text-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={input.awayTeamName} onChange={e => setInput({...input, awayTeamName: e.target.value})} required />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <MoodSelector label="Momento Mandante" value={input.homeMood} onChange={m => setInput({...input, homeMood: m})} colorClass="text-blue-400" />
                    <MoodSelector label="Momento Visitante" value={input.awayMood} onChange={m => setInput({...input, awayMood: m})} colorClass="text-red-400" />
                 </div>

                 <RiskSelector value={input.riskLevel} onChange={r => setInput({...input, riskLevel: r})} />

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data da Partida</label>
                    <input type="date" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-mono [color-scheme:dark]" value={input.date} onChange={e => setInput({...input, date: e.target.value})} />
                 </div>

                 <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 py-5 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                   {loading ? <Loader2 className="animate-spin" size={24} /> : 'Processar Kickoff'}
                 </button>
              </form>
            </div>
          ) : (
            <ResultView result={result} onReset={resetSimulation} />
          )
        )}
        {mode === 'batch' && <BatchMode />}
        {mode === 'history' && <HistoryMode />}
        {mode === 'var' && <VarMode />}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 grid grid-cols-4 p-2 pb-6 z-50">
          {[
            { id: 'single', icon: Activity },
            { id: 'batch', icon: Trophy },
            { id: 'history', icon: History },
            { id: 'var', icon: MonitorPlay }
          ].map(t => (
            <button key={t.id} onClick={() => setMode(t.id as any)} className={`flex flex-col items-center gap-1 py-2 ${mode === t.id ? 'text-emerald-500' : 'text-slate-500'}`}>
              <t.icon size={20} />
              <span className="text-[8px] font-bold uppercase">{t.id}</span>
            </button>
          ))}
      </nav>
    </div>
  );
};

export default App;
