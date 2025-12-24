
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo, VarAnalysisResult, MatchCandidate } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getApiKey = (): string => process.env.API_KEY || "";

const parseGeminiResponse = (text: string): any => {
  try {
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startBrace = cleanText.indexOf('{');
    const startBracket = cleanText.indexOf('[');
    
    let start = -1;
    if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) {
      start = startBrace;
    } else {
      start = startBracket;
    }

    if (start === -1) return null;

    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    
    return JSON.parse(cleanText.substring(start, end + 1));
  } catch (e) {
    console.error("Erro no parse do JSON:", text);
    throw new Error("Falha ao interpretar dados da IA.");
  }
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Realize uma análise estatística e tática profunda para o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. 
  Considere o perfil de risco ${input.riskLevel}. Obs extras: ${input.observations}.
  OBRIGATÓRIO: Retorne apenas um JSON seguindo a interface SimulationResult.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

  const data = parseGeminiResponse(response.text);
  if (!data) throw new Error("Informações não encontradas para este confronto.");

  return { ...data, matchDate: input.date, sources };
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, obs: string, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const results: BatchResultItem[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `Analisando: ${m.homeTeam} x ${m.awayTeam}`);
    
    const prompt = `Simule: ${m.homeTeam} vs ${m.awayTeam} (${m.date}). JSON estrito: {homeWinProb, drawProb, awayWinProb, summary, bettingTip, bettingTipCode}`;
    const resp = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    const parsed = parseGeminiResponse(resp.text);
    if (parsed) {
      results.push({ ...parsed, id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
    }
    await delay(500);
  }
  return results;
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Liste os 14 jogos da Loteca concurso ${concurso}. Se não encontrar, retorne um array vazio []. JSON Array: [{homeTeam, awayTeam, date}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return parseGeminiResponse(resp.text) || [];
};

export const runVarAnalysis = async (h: string, a: string, d: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Análise de arbitragem histórica para ${h} x ${a} em ${d}. Se não houver dados específicos, analise o perfil do árbitro e estilo dos times. JSON: {referee, refereeGrade, summary, incidents: [{minute, description, expertOpinion, verdict}]}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const data = parseGeminiResponse(resp.text);
  if (!data) throw new Error("Não foi possível realizar a análise deste jogo.");
  return { ...data, match: `${h} x ${a}`, date: d, sources: [] };
};

export const findMatchesByYear = async (tA: string, tB: string, y: string): Promise<MatchCandidate[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Pesquise partidas reais entre ${tA} e ${tB} no ano ${y}. 
    IMPORTANTE: Se não encontrar nenhuma partida oficial, retorne APENAS um array vazio []. 
    JSON Array: [{date, homeTeam, awayTeam, score, competition}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return parseGeminiResponse(resp.text) || [];
};

export const fetchLoteriaPrizeInfo = async (concurso: string): Promise<LoteriaPrizeInfo> => {
    return { concurso, prize14: "R$ 0,00", winners14: 0, prize13: "R$ 0,00", winners13: 0, accumulated: false };
};

export const checkMatchResults = async (matches: BatchMatchInput[]): Promise<BatchMatchInput[]> => matches;
export const runHistoricalBacktest = async (s: number, e: number, p: any): Promise<any[]> => [];
