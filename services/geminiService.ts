
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, VarAnalysisResult, HistoricalTrendResult } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função ultra-robusta para extrair JSON de qualquer string retornada pela IA
const extractJSON = (text: string) => {
  try {
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (e) {
    console.error("Erro ao parsear JSON:", e);
    return null;
  }
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise detalhadamente o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. 
  Considere o momento: Casa (${input.homeMood}), Fora (${input.awayMood}). Risco: ${input.riskLevel}.
  Retorne um JSON estrito seguindo a interface SimulationResult.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      temperature: 0.2 
    },
  });

  const data = extractJSON(response.text);
  if (!data) throw new Error("A IA não conseguiu formatar os dados. Tente novamente.");
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

  return { ...data, matchDate: input.date, sources };
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Liste os 14 jogos da Loteca concurso ${concurso}. Se não encontrar, use o concurso mais recente.
  Retorne APENAS um array JSON: [{"id": "1", "homeTeam": "Time A", "awayTeam": "Time B", "date": "YYYY-MM-DD"}]`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0 }
  });

  const data = extractJSON(response.text);
  return Array.isArray(data) ? data : [];
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const results: BatchResultItem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `Analisando: ${m.homeTeam} x ${m.awayTeam}`);
    
    try {
      const prompt = `Simule rápido: ${m.homeTeam} vs ${m.awayTeam}. JSON: {"homeWinProb": 0, "drawProb": 0, "awayWinProb": 0, "summary": "...", "bettingTip": "...", "bettingTipCode": "1"}`;
      const resp = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { temperature: 0.1 }
      });
      const parsed = extractJSON(resp.text);
      if (parsed) {
        results.push({ ...parsed, id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
      }
    } catch (e) {
      console.error(`Erro no jogo ${m.id}:`, e);
    }
    await delay(200);
  }
  return results;
};

export const runVarAnalysis = async (home: string, away: string, date: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Pesquise polêmicas de arbitragem e decisões do VAR para o jogo ${home} vs ${away} em ${date}.
  Retorne um JSON: {
    "referee": "Nome",
    "refereeGrade": 0,
    "summary": "Resumo das polêmicas",
    "incidents": [{"minute": "X", "description": "...", "expertOpinion": "...", "verdict": "CORRECT"}]
  }`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
  });

  const data = extractJSON(resp.text);
  if (!data) throw new Error("Não encontramos detalhes de arbitragem para este jogo.");

  const sources = resp.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

  return { ...data, match: `${home} x ${away}`, date, sources };
};

export const runHistoricalBacktest = async (team: string, competition: string, year: string): Promise<HistoricalTrendResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise o histórico de ${team} em ${competition} (${year}). Use Google Search para dados reais.
  Retorne um JSON HistoricalTrendResult.`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
  });

  const data = extractJSON(resp.text);
  if (!data) throw new Error("Dados históricos indisponíveis.");
  return data;
};
