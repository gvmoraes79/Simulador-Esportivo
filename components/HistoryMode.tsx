
import React from 'react';
import { History, Search } from 'lucide-react';

const HistoryMode: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3rem] text-center space-y-6 animate-fade-in-up">
       <div className="bg-slate-950 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-slate-800 shadow-xl">
          <History className="text-emerald-500" size={32} />
       </div>
       <h2 className="text-2xl font-black text-white uppercase italic">Análise de Tendência Histórica</h2>
       <p className="text-slate-500 text-sm max-w-md mx-auto">
          Este modo utiliza o histórico de dados do Gemini para identificar padrões e otimizar suas estratégias de aposta ao longo do tempo.
       </p>
       <div className="flex justify-center pt-6">
          <button className="bg-slate-800 text-slate-400 font-black px-8 py-3 rounded-2xl cursor-not-allowed border border-slate-700">
             Em Breve: Backtest v2
          </button>
       </div>
    </div>
  );
};

export default HistoryMode;
