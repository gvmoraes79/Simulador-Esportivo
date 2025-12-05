
import React from 'react';
import { RiskLevel } from '../types';
import { Shield, Target, Zap, PieChart, Flame } from 'lucide-react';

interface RiskSelectorProps {
  value: RiskLevel;
  onChange: (level: RiskLevel) => void;
}

const RiskSelector: React.FC<RiskSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="w-full">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block text-center md:text-left">
        Estratégia de Aposta (Perfil de Risco)
      </label>
      
      {/* Grid responsivo: 3 colunas em mobile, 5 colunas em desktop */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
        
        {/* 1. Conservador */}
        <button
          type="button"
          onClick={() => onChange(RiskLevel.CONSERVATIVE)}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300
            ${value === RiskLevel.CONSERVATIVE 
              ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
          `}
        >
          <Shield size={20} className={value === RiskLevel.CONSERVATIVE ? 'text-emerald-400' : 'text-slate-500'} />
          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${value === RiskLevel.CONSERVATIVE ? 'text-emerald-300' : 'text-slate-500'}`}>
            Conservador
          </span>
          {value === RiskLevel.CONSERVATIVE && (
             <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded-full">ATIVO</span>
          )}
        </button>

        {/* 2. Calculado (Novo) */}
        <button
          type="button"
          onClick={() => onChange(RiskLevel.CALCULATED)}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300
            ${value === RiskLevel.CALCULATED 
              ? 'bg-cyan-950/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
              : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
          `}
        >
          <PieChart size={20} className={value === RiskLevel.CALCULATED ? 'text-cyan-400' : 'text-slate-500'} />
          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${value === RiskLevel.CALCULATED ? 'text-cyan-300' : 'text-slate-500'}`}>
            Calculado
          </span>
           {value === RiskLevel.CALCULATED && (
             <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded-full">ATIVO</span>
          )}
        </button>

        {/* 3. Moderado */}
        <button
          type="button"
          onClick={() => onChange(RiskLevel.MODERATE)}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300
            ${value === RiskLevel.MODERATE 
              ? 'bg-amber-950/60 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
          `}
        >
          <Target size={20} className={value === RiskLevel.MODERATE ? 'text-amber-400' : 'text-slate-500'} />
          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${value === RiskLevel.MODERATE ? 'text-amber-300' : 'text-slate-500'}`}>
            Moderado
          </span>
           {value === RiskLevel.MODERATE && (
             <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded-full">ATIVO</span>
          )}
        </button>

        {/* 4. Agressivo (Novo) */}
        <button
          type="button"
          onClick={() => onChange(RiskLevel.AGGRESSIVE)}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300
            ${value === RiskLevel.AGGRESSIVE 
              ? 'bg-orange-950/60 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
              : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
          `}
        >
          <Flame size={20} className={value === RiskLevel.AGGRESSIVE ? 'text-orange-400' : 'text-slate-500'} />
          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${value === RiskLevel.AGGRESSIVE ? 'text-orange-300' : 'text-slate-500'}`}>
            Agressivo
          </span>
           {value === RiskLevel.AGGRESSIVE && (
             <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-slate-950 text-[8px] font-bold px-1.5 py-0.5 rounded-full">ATIVO</span>
          )}
        </button>

        {/* 5. Ousado */}
        <button
          type="button"
          onClick={() => onChange(RiskLevel.BOLD)}
          className={`
            relative flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-all duration-300 col-span-1 md:col-span-1
            ${value === RiskLevel.BOLD 
              ? 'bg-purple-950/60 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
              : 'bg-slate-900/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}
          `}
        >
          <Zap size={20} className={value === RiskLevel.BOLD ? 'text-purple-400' : 'text-slate-500'} />
          <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${value === RiskLevel.BOLD ? 'text-purple-300' : 'text-slate-500'}`}>
            Ousado
          </span>
           {value === RiskLevel.BOLD && (
             <span className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">ATIVO</span>
          )}
        </button>
      </div>
      
      {/* Risk Description Hint */}
      <div className="mt-2 text-center h-4">
        <p className="text-[10px] text-slate-500 italic animate-fade-in">
          {value === RiskLevel.CONSERVATIVE && "Prioriza segurança máxima, Dupla Chance (1X/X2) e favoritos claros."}
          {value === RiskLevel.CALCULATED && "Analítico: Busca valor em favoritos sólidos, mas cobre empates táticos."}
          {value === RiskLevel.MODERATE && "Equilíbrio padrão entre segurança e potencial de retorno."}
          {value === RiskLevel.AGGRESSIVE && "Mais arriscado: Busca vitórias secas fora de casa e ignora empates."}
          {value === RiskLevel.BOLD && "Caçador de Zebras: Foca em resultados improváveis com alto retorno."}
        </p>
      </div>
    </div>
  );
};

export default RiskSelector;
