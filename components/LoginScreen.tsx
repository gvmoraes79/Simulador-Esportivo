
import React, { useState, useEffect } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginScreenProps {
  onLogin: () => void;
  initialInviteCode?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, initialInviteCode = '' }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialInviteCode) {
      setInviteCode(initialInviteCode.toUpperCase());
      setIsRegistering(true);
    }
  }, [initialInviteCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) return setError('Preencha os campos.');

    setLoading(true);
    setTimeout(() => {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('Senhas não coincidem.');
          setLoading(false);
          return;
        }
        const res = authService.register(username, password, inviteCode);
        if (res.success) onLogin(); else setError(res.message);
      } else {
        const res = authService.login(username, password);
        if (res.success) onLogin(); else setError(res.message);
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
            SportSim <span className="text-emerald-500">Pro</span>
          </h1>
          <div className="h-1 w-12 bg-emerald-500 mx-auto mt-4 rounded-full"></div>
          <p className="text-slate-500 text-[10px] font-bold mt-4 uppercase tracking-[0.3em]">AI Prediction Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input 
            type="text" placeholder="Usuário" 
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
            value={username} onChange={e => setUsername(e.target.value)}
          />
          <input 
            type="password" placeholder="Senha" 
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
            value={password} onChange={e => setPassword(e.target.value)}
          />

          {isRegistering && (
            <>
              <input 
                type="password" placeholder="Confirmar Senha" 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              />
              <div className="relative">
                <Ticket className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                <input 
                  type="text" placeholder="CÓDIGO DE CONVITE" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 pl-14 text-white uppercase font-black tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}

          {error && <div className="text-red-400 text-[10px] font-bold text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</div>}

          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
            <button type="button" onClick={() => { setIsRegistering(false); setError(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:text-slate-400'}`}>Entrar</button>
            <button type="button" onClick={() => { setIsRegistering(true); setError(''); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:text-slate-400'}`}>Cadastrar</button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegistering ? 'Criar Acesso' : 'Entrar no Hub')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
