
import React, { useState, useEffect } from 'react';
import { MatchInput, TeamMood, SimulationResult, RiskLevel } from './types';
import MoodSelector from './components/MoodSelector';
import ResultView from './components/ResultView';
import BatchMode from './components/BatchMode';
import HistoryMode from './components/HistoryMode'; 
import VarMode from './components/VarMode'; // Import
import RiskSelector from './components/RiskSelector';
import { runSimulation, getApiKey } from './services/geminiService'; // Import getApiKey
import { authService } from './services/authService'; // Import Auth
import { Loader2, Calendar, Search, Layers, Activity, Trophy, MessageSquare, History, MonitorPlay, LogOut, User, Settings, Key, X, Save } from 'lucide-react';
import LoginScreen from './components/LoginScreen';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [mode, setMode] = useState<'single' | 'batch' | 'history' | 'var'>('single');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const [input, setInput] = useState<MatchInput>({
    homeTeamName: '',
    awayTeamName: '',
    date: new Date().toISOString().split('T')[0],
    homeMood: TeamMood.REGULAR,
    awayMood: TeamMood.REGULAR,
    observations: '',
    riskLevel: RiskLevel.MODERATE,
  });

  // Check Session on Mount & Force API Key Prompt
  useEffect(() => {
    // 1. Session Check
    const sessionUser = authService.checkSession();
    if (sessionUser) {
      setCurrentUser(sessionUser);
      setIsAuthenticated(true);
    }
    
    // 2. Key Detection
    const key = getApiKey();
    if (key) {
        setApiKey(key);
    } else {
        // Se não encontrar chave, força abertura do settings
        setShowSettings(true);
    }

    // 3. URL Magic Link Check (se existir)
    const params = new URLSearchParams(window.location.search);
    const magicKey = params.get('key');
    if (magicKey) {
        localStorage.setItem('sportsim_api_key', magicKey);
        setApiKey(magicKey);
        window.history.replaceState({}, document.title, "/");
        setShowSettings(false);
    }
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser('');
    setResult(null);
  };

  const handleLoginSuccess = () => {
    const user = authService.checkSession();
    if (user) setCurrentUser(user);
    setIsAuthenticated(true);
    
    if (!getApiKey()) {
        setShowSettings(true);
    }
  };
  
  const saveSettings = () => {
     if (apiKey.trim()) {
        localStorage.setItem('sportsim_api_key', apiKey.trim());
        setShowSettings(false);
        // Limpa erro anterior se houver
        if (error && error.includes('API')) setError(null);
        alert("Chave API salva e pronta para uso!");
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.homeTeamName || !input.awayTeamName) return;

    setLoading(true);
    setError(null);

    try {
      const data = await runSimulation(input);
      setResult(data);
    } catch (err: any) {
      const msg = err.message || "Erro desconhecido";
      if (msg.includes("API Key") || msg.includes("chave") || msg.includes("configurada")) {
         setError("⚠️ É necessário configurar a API Key para usar o simulador.");
         setShowSettings(true); // AUTO-OPEN SETTINGS
      } else {
         setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-12">
      {/* Sports Broadcast Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/20">
              <Trophy size={24} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 font-display uppercase">
                SportSim <span className="text-emerald-500">Pro</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AI Analytics Engine</p>
            </div>
          </div>
          
          {/* Tabs - Pill Shape */}
          <div className="flex bg-slate-950/50 p-1.5 rounded-full border border-slate-800 shadow-inner overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
            <button
              onClick={() => { setMode('single'); handleReset(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                mode === 'single' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity size={14} /> <span className="hidden md:inline">Partida Única</span>
            </button>
            <button
              onClick={() => { setMode('batch'); handleReset(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                mode === 'batch' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers size={14} /> <span className="hidden md:inline">Loteria</span>
            </button>
            <button
              onClick={() => { setMode('history'); handleReset(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                mode === 'history' 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History size={14} /> <span className="hidden md:inline">Histórico</span>
            </button>
            <button
              onClick={() => { setMode('var'); handleReset(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                mode === 'var' 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MonitorPlay size={14} /> <span className="hidden md:inline">VAR</span>
            </button>
          </div>

          {/* User Profile / Logout */}
          <div className="flex items-center gap-2 ml-2">
             <div className="hidden md:flex items-center gap-2 text-right">
                <div className="text-xs font-bold text-white">{currentUser}</div>
             </div>
             
             <button 
               onClick={() => setShowSettings(true)}
               className={`bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition-colors border border-slate-700 text-slate-300 hover:text-white ${!apiKey ? 'animate-pulse ring-2 ring-red-500' : ''}`}
               title="Configurações (API Key)"
             >
                <Settings size={18} />
             </button>

             <button 
               onClick={handleLogout}
               className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-lg transition-colors border border-slate-700"
               title="Sair"
             >
                <LogOut size={18} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 relative">
        
        {/* Settings Modal */}
        {showSettings && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6 relative">
                 <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                 </button>
                 
                 <div className="flex items-center gap-3 mb-6">
                    <div className="bg-slate-800 p-3 rounded-xl">
                       <Settings className="text-emerald-400" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Configuração Obrigatória</h2>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-200 text-xs mb-4">
                       <strong>Atenção:</strong> Para usar o simulador, cole sua chave da API do Google Gemini abaixo.
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Google Gemini API Key</label>
                       <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm"
                            placeholder="AIzaSy..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                          />
                       </div>
                       <p className="text-[10px] text-slate-500 mt-2">
                          Sua chave é salva apenas no seu navegador. 
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline ml-1">
                             Obter chave grátis aqui.
                          </a>
                       </p>
                    </div>
                    
                    <button 
                      onClick={saveSettings}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                    >
                       <Save size={18} /> Salvar e Continuar
                    </button>
                 </div>
              </div>
           </div>
        )}

        {error && !showSettings && (
             <div className="mb-8 bg-red-950/50 border border-red-500/50 p-4 rounded-xl text-red-200 text-center animate-fade-in flex flex-col items-center gap-2">
                 <div className="flex items-center gap-2">
                     <Settings size={18}/> <span>{error}</span>
                 </div>
                 {error.includes("API Key") && (
                     <button onClick={() => setShowSettings(true)} className="text-xs bg-red-900 hover:bg-red-800 px-4 py-2 rounded-full font-bold">
                         Configurar Agora
                     </button>
                 )}
             </div>
        )}

        {mode === 'batch' && <BatchMode />}
        
        {mode === 'history' && <HistoryMode />}
        
        {mode === 'var' && <VarMode />}
        
        {mode === 'single' && (
          /* Single Match Logic */
          !result ? (
            <div className="max-w-xl mx-auto animate-fade-in-up">
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-red-500"></div>
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                
                <div className="p-8 relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-8 text-center uppercase tracking-wide flex items-center justify-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Configurar Simulação
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Teams Input - Stadium Board Style */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 group">
                        <label className="text-xs font-bold text-blue-400 uppercase tracking-wider ml-1">Mandante</label>
                        <input
                          type="text"
                          required
                          placeholder="Nome do Time"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white text-lg font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-700 placeholder:font-normal text-center shadow-inner group-hover:border-blue-900/50"
                          value={input.homeTeamName}
                          onChange={(e) => setInput({ ...input, homeTeamName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 group">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-wider ml-1 text-right block">Visitante</label>
                        <input
                          type="text"
                          required
                          placeholder="Nome do Time"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white text-lg font-bold focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all placeholder:text-slate-700 placeholder:font-normal text-center shadow-inner group-hover:border-red-900/50"
                          value={input.awayTeamName}
                          onChange={(e) => setInput({ ...input, awayTeamName: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                        <Calendar size={14} /> Data do Confronto
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm font-medium cursor-pointer [color-scheme:dark]"
                        value={input.date}
                        onChange={(e) => setInput({ ...input, date: e.target.value })}
                        onFocus={(e) => e.target.showPicker()}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch {
                            // Ignore if not supported
                          }
                        }}
                      />
                    </div>

                    {/* Mood Selectors */}
                    <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <MoodSelector
                          label="MOMENTO (CASA)"
                          value={input.homeMood}
                          onChange={(mood) => setInput({ ...input, homeMood: mood })}
                          colorClass="text-blue-400"
                        />
                        <MoodSelector
                          label="MOMENTO (FORA)"
                          value={input.awayMood}
                          onChange={(mood) => setInput({ ...input, awayMood: mood })}
                          colorClass="text-red-400"
                        />
                      </div>
                    </div>

                     {/* Risk Level Selector */}
                     <RiskSelector 
                       value={input.riskLevel}
                       onChange={(level) => setInput({ ...input, riskLevel: level })}
                     />

                     {/* Observations Input */}
                     <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                        <MessageSquare size={14} /> Observações Táticas / Contexto Extra
                      </label>
                      <textarea
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm font-medium resize-y"
                        placeholder="Ex: Neymar volta de lesão hoje, Técnico demitido ontem, Estádio lotado, Gramado sintético molhado..."
                        rows={3}
                        value={input.observations || ''}
                        onChange={(e) => setInput({ ...input, observations: e.target.value })}
                      />
                    </div>

                    {/* Info Box */}
                    <div className="text-xs text-slate-400 bg-blue-900/10 p-4 rounded-xl border border-blue-900/20 flex gap-3">
                      <div className="bg-blue-500/20 p-1.5 rounded-lg h-fit">
                         <Search size={14} className="text-blue-400" />
                      </div>
                      <p className="leading-relaxed">
                        <strong className="text-blue-300 block mb-1">Dica de Pro:</strong>
                        Para análise tática precisa, simule 1 hora antes do jogo. Nossa IA rastreia as escalações oficiais em tempo real.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg border border-emerald-500/20 transform hover:-translate-y-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" /> Analisando Dados...
                        </>
                      ) : (
                        <>
                          Kickoff <span className="bg-white/20 px-2 py-0.5 rounded text-xs">AI</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <ResultView result={result} onReset={handleReset} />
          )
        )}
      </main>
    </div>
  );
};

export default App;
