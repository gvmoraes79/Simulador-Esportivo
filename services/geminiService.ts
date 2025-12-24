
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo, VarAnalysisResult, MatchCandidate } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getApiKey = (): string => process.env.API_KEY || "";

const parseGeminiResponse = (text: string): any => {
  try {
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleanText.indexOf('{') !== -1 ? cleanText.indexOf('{') : cleanText.indexOf('[');
    const end = Math.max(cleanText.lastIndexOf('}'), cleanText.lastIndexOf(']'));
    return JSON.parse(cleanText.substring(start, end + 1));
  } catch (e) {
    throw new Error("Falha ao interpretar dados da IA.");
  }
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Realize uma análise estatística e tática profunda para o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. 
  Considere o perfil de risco ${input.riskLevel}. Obs extras: ${input.observations}.
  Retorne um JSON detalhado seguindo a interface SimulationResult.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

  return { ...parseGeminiResponse(response.text), matchDate: input.date, sources };
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, obs: string, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const results: BatchResultItem[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `Analisando: ${m.homeTeam} x ${m.awayTeam}`);
    
    const prompt = `Simule: ${m.homeTeam} vs ${m.awayTeam} (${m.date}). JSON: {homeWinProb, drawProb, awayWinProb, summary, bettingTip, bettingTipCode}`;
    const resp = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    results.push({ ...parseGeminiResponse(resp.text), id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
    await delay(500);
  }
  return results;
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Liste os 14 jogos da Loteca concurso ${concurso}. JSON Array: [{homeTeam, awayTeam, date}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return parseGeminiResponse(resp.text).map((m: any, i: number) => ({ ...m, id: (i+1).toString() }));
};

export const runVarAnalysis = async (h: string, a: string, d: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Análise de arbitragem histórica: ${h} x ${a} em ${d}. JSON: {referee, refereeGrade, summary, incidents: [{minute, description, expertOpinion, verdict}]}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return { ...parseGeminiResponse(resp.text), match: `${h} x ${a}`, date: d, sources: [] };
};

export const findMatchesByYear = async (tA: string, tB: string, y: string): Promise<MatchCandidate[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Jogos entre ${tA} e ${tB} no ano ${y}. JSON Array: [{date, homeTeam, awayTeam, score, competition}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return parseGeminiResponse(resp.text);
};

export const fetchLoteriaPrizeInfo = async (concurso: string): Promise<LoteriaPrizeInfo> => {
    return { concurso, prize14: "R$ 0,00", winners14: 0, prize13: "R$ 0,00", winners13: 0, accumulated: false };
};

export const checkMatchResults = async (matches: BatchMatchInput[]): Promise<BatchMatchInput[]> => matches;
export const runHistoricalBacktest = async (s: number, e: number, p: any): Promise<any[]> => [];
