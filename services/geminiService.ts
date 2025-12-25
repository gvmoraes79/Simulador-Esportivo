
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, VarAnalysisResult, HistoricalTrendResult } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getAIInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const TIMEZONE_CONTEXT = "Considere sempre o Horário de Brasília (GMT-3).";

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const ai = getAIInstance();
  const prompt = `Analise o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}.
  Contexto: ${TIMEZONE_CONTEXT} Mandante ${input.homeMood}, Visitante ${input.awayMood}. Risco: ${input.riskLevel}.
  Obs: ${input.observations || 'Nenhuma'}.
  Retorne um JSON estrito seguindo a interface SimulationResult. Inclua dados de clima, árbitro e escalações prováveis.`;

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
  const ai = getAIInstance();
  const prompt = `Liste exatamente os 14 jogos da Loteca concurso ${concurso}. 
  ${TIMEZONE_CONTEXT} Se não encontrar este concurso, traga o mais recente.
  Retorne um ARRAY JSON: [{"id": "1", "homeTeam": "...", "awayTeam": "...", "date": "..."}].`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "[]");
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = getAIInstance();
  const results: BatchResultItem[] = [];
  
  // Processamento em Chunks de 2 para evitar Rate Limit 429 e melhorar consistência
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `${m.homeTeam} x ${m.awayTeam}`);
    
    try {
      const prompt = `Simule: ${m.homeTeam} vs ${m.awayTeam}. Risco ${risk}. ${TIMEZONE_CONTEXT}
      Retorne JSON: {"homeWinProb": %, "drawProb": %, "awayWinProb": %, "summary": "...", "bettingTip": "...", "bettingTipCode": "1, X ou 2"}`;
      
      const resp = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.1 }
      });
      
      const parsed = JSON.parse(resp.text || "{}");
      results.push({ ...parsed, id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
    } catch (e) {
      console.error(`Erro no jogo ${m.id}`, e);
    }
    await delay(500); // Delay aumentado para estabilidade em produção
  }
  return results;
};

export const runVarAnalysis = async (home: string, away: string, date: string): Promise<VarAnalysisResult> => {
  const ai = getAIInstance();
  const prompt = `Analise polêmicas e decisões do VAR de ${home} x ${away} em ${date}. 
  Raciocine profundamente sobre as regras da FIFA. ${TIMEZONE_CONTEXT}`;

  // Uso de Thinking Budget para análise de regras complexas (Prognóstico Profissional)
  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 4000 } 
    }
  });

  const data = JSON.parse(resp.text || "{}");
  const sources = resp.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

  return { ...data, match: `${home} x ${away}`, date, sources };
};

export const runHistoricalBacktest = async (team: string, competition: string, year: string): Promise<HistoricalTrendResult> => {
  const ai = getAIInstance();
  const prompt = `Analise estatísticas detalhadas de ${team} em ${competition} no ano ${year}. ${TIMEZONE_CONTEXT}
  Retorne JSON com winRate, tacticalPattern e recentMatches.`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });

  return JSON.parse(resp.text || "{}");
};
