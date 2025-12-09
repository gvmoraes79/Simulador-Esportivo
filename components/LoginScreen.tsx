
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, UserPlus, LogIn, Key } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Carrega chave existente se houver
  useEffect(() => {
     const storedKey = localStorage.getItem('sportsim_api_key');
     if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    // Salva a API Key no navegador se o usuário informou (qualquer formato não vazio)
    if (apiKey.trim()) {
        localStorage.setItem('sportsim_api_key', apiKey.trim());
    }

    if (isRegistering) {
      // Lógica de Registro
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }

      const result = authService.register(username, password);
      if (result.success) {
        setSuccessMsg(result.message);
        setTimeout(() => onLogin(), 1000);
      } else {
        setError(result.message);
      }

    } else {
      // Lógica de Login
      const result = authService.login(username, password);
      if (result.success) {
        onLogin();
      } else {
        setError(result.message);
      }
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccessMsg('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
       {/* Background Effects */}
       <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e293b,transparent_70%)]"></div>
       <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-800 relative z-10 animate-fade-in-up transition-all duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            SportSim <span className="text-emerald-500">Pro</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            {isRegistering ? 'Criar Nova Conta' : 'Acesso Restrito'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
           <button 
             type="button"
             onClick={() => !isRegistering || toggleMode()}
             className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isRegistering ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Entrar
           </button>
           <button 
             type="button"
             onClick={() => isRegistering || toggleMode()}
             className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isRegistering ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Cadastrar
           </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Usuário</label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-800"
              placeholder="Seu nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Senha</label>
            <input
              type="password"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-800"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegistering && (
             <div className="animate-fade-in">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Confirmar Senha</label>
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold placeholder:text-slate-800"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
             </div>
          )}

          {/* API Key Input */}
          <div className="pt-2 border-t border-slate-800 mt-4">
             <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-1">
               <Key size={12}/> Google Gemini API Key
             </label>
             <input
               type="text"
               className="w-full bg-slate-950 border border-emerald-900/50 rounded-xl px-4 py-3 text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-xs placeholder:text-emerald-900/50"
               placeholder="AIzaSy... (Opcional se já configurado)"
               value={apiKey}
               onChange={(e) => setApiKey(e.target.value)}
             />
             <p className="text-[9px] text-slate-500 mt-1 ml-1">
               Cole sua chave aqui para não precisar criar arquivo .env
             </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-3 rounded-lg text-center animate-pulse flex items-center justify-center gap-2">
              <Lock size={12} /> {error}
            </div>
          )}
          
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold p-3 rounded-lg text-center animate-pulse flex items-center justify-center gap-2">
              <ShieldCheck size={12} /> {successMsg}
            </div>
          )}

          <button
            type="submit"
            className={`w-full text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group mt-4 ${isRegistering ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
          >
            {isRegistering ? (
                <>
                  <UserPlus size={18} /> Criar Conta
                </>
            ) : (
                <>
                  <LogIn size={18} /> Acessar Sistema
                </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
           <p className="text-[10px] text-slate-600 font-mono">
             Security Gateway v3.1.0 • Local Storage Auth
           </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
