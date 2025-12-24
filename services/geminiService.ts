
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, VarAnalysisResult, HistoricalTrendResult } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise o jogo de futebol: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. 
  Considere: Mandante ${input.homeMood}, Visitante ${input.awayMood}. Risco: ${input.riskLevel}.
  Retorne um objeto JSON conforme a interface SimulationResult. Inclua placar previsto, probabilidades, análise tática e sugestão de aposta.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
      responseMimeType: "application/json"
    },
  });

  const data = JSON.parse(response.text || "{}");
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

  return { ...data, matchDate: input.date, sources };
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Pesquise os 14 jogos da Loteca concurso ${concurso}. 
  Retorne um ARRAY de objetos: [{"id": "1", "homeTeam": "Time A", "awayTeam": "Time B", "date": "Data"}].`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    }
  });

  const data = JSON.parse(response.text || "[]");
  return Array.isArray(data) ? data : [];
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const results: BatchResultItem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `${m.homeTeam} x ${m.awayTeam}`);
    
    try {
      const prompt = `Simule o resultado para: ${m.homeTeam} vs ${m.awayTeam}. 
      Retorne JSON: {"homeWinProb": %, "drawProb": %, "awayWinProb": %, "summary": "...", "bettingTip": "...", "bettingTipCode": "1, X ou 2"}`;
      
      const resp = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.1 }
      });
      
      const parsed = JSON.parse(resp.text || "{}");
      results.push({ ...parsed, id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
    } catch (e) {
      console.error(`Erro no jogo ${m.id}`);
    }
    await delay(300);
  }
  return results;
};

export const runVarAnalysis = async (home: string, away: string, date: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise lances polêmicos e VAR do jogo ${home} x ${away} em ${date}.
  Retorne JSON: {"referee": "Nome", "refereeGrade": 0, "summary": "...", "incidents": [{"minute": "X", "description": "...", "expertOpinion": "...", "verdict": "CORRECT/ERROR"}]}`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      temperature: 0.2 
    }
  });

  const data = JSON.parse(resp.text || "{}");
  const sources = resp.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

  return { ...data, match: `${home} x ${away}`, date, sources };
};

export const runHistoricalBacktest = async (team: string, competition: string, year: string): Promise<HistoricalTrendResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise o histórico de ${team} em ${competition} no ano de ${year}.
  Retorne JSON HistoricalTrendResult com taxas de vitória e padrões táticos.`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      temperature: 0.2 
    }
  });

  return JSON.parse(resp.text || "{}");
};
