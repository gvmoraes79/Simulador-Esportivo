
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, VarAnalysisResult, HistoricalTrendResult } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função ultra-robusta para extrair JSON de qualquer string retornada pela IA
const extractJSON = (text: string) => {
  if (!text) return null;
  try {
    // Tenta encontrar o bloco JSON mais externo { } ou [ ]
    const startBrace = text.indexOf('{');
    const startBracket = text.indexOf('[');
    let start = -1;
    if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) start = startBrace;
    else if (startBracket !== -1) start = startBracket;

    const endBrace = text.lastIndexOf('}');
    const endBracket = text.lastIndexOf(']');
    let end = -1;
    if (endBrace !== -1 && (endBracket === -1 || endBrace > endBracket)) end = endBrace;
    else if (endBracket !== -1) end = endBracket;

    if (start === -1 || end === -1 || end < start) return null;

    const jsonString = text.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Falha ao processar JSON. Resposta original:", text);
    return null;
  }
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise detalhadamente o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. 
  Considere o momento: Casa (${input.homeMood}), Fora (${input.awayMood}). Risco: ${input.riskLevel}.
  Obs adicionais: ${input.observations || 'Nenhuma'}.
  Retorne um JSON SimulationResult com placar previsto, análise tática, clima e árbitro.`;

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
  const prompt = `Liste EXATAMENTE os 14 jogos da Loteca concurso ${concurso}. 
  Retorne APENAS um array JSON: [{"id": "1", "homeTeam": "Time A", "awayTeam": "Time B", "date": "YYYY-MM-DD"}]
  IMPORTANTE: Não escreva nada além do JSON.`;

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
    if (onProgress) onProgress(i + 1, matches.length, `${m.homeTeam} x ${m.awayTeam}`);
    
    try {
      const prompt = `Simule: ${m.homeTeam} vs ${m.awayTeam}. JSON: {"homeWinProb": 0, "drawProb": 0, "awayWinProb": 0, "summary": "...", "bettingTip": "...", "bettingTipCode": "1"}`;
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
    await delay(250);
  }
  return results;
};

export const runVarAnalysis = async (home: string, away: string, date: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analise a arbitragem de ${home} x ${away} em ${date}. Busque por polêmicas de VAR reais.
  Retorne um JSON VarAnalysisResult {referee, refereeGrade, summary, incidents: [{minute, description, expertOpinion, verdict}]}`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
  });

  const data = extractJSON(resp.text);
  if (!data) throw new Error("Análise indisponível.");

  const sources = resp.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((c: any) => c.web)
    ?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

  return { ...data, match: `${home} x ${away}`, date, sources };
};

export const runHistoricalBacktest = async (team: string, competition: string, year: string): Promise<HistoricalTrendResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Histórico de ${team} em ${competition} (${year}). Use Search.
  JSON HistoricalTrendResult: {team, period, winRate, drawRate, lossRate, avgGoalsScored, avgGoalsConceded, tacticalPattern, consistencyScore, bestStrategy, recentMatches}`;

  const resp = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
  });

  const data = extractJSON(resp.text);
  if (!data) throw new Error("Dados históricos indisponíveis.");
  return data;
};
