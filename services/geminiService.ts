
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo, VarAnalysisResult, MatchCandidate } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getApiKey = (): string => process.env.API_KEY || "";

const parseGeminiResponse = (text: string): any => {
  if (!text) return null;
  
  try {
    // Remove blocos de código markdown se existirem
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Tenta encontrar o primeiro caractere que pode ser o início de um JSON ([ ou {)
    const startBrace = cleanText.indexOf('{');
    const startBracket = cleanText.indexOf('[');
    
    let start = -1;
    if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) {
      start = startBrace;
    } else if (startBracket !== -1) {
      start = startBracket;
    }

    if (start === -1) return null;

    // Encontra o último caractere que pode ser o fim de um JSON (] ou })
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    
    if (end === -1 || end < start) return null;

    const jsonString = cleanText.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Falha no parse do JSON:", e);
    return null;
  }
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const prompt = `Analise o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. 
  Perfil de risco: ${input.riskLevel}. Obs: ${input.observations}.
  Use o Google Search para verificar escalações reais e lesões recentes.
  RETORNE APENAS O JSON seguindo a interface SimulationResult.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      temperature: 0.1
    },
  });
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

  const data = parseGeminiResponse(response.text);
  if (!data) throw new Error("Não foi possível processar a simulação agora.");

  return { ...data, matchDate: input.date, sources };
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, obs: string, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const results: BatchResultItem[] = [];
  
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `Analisando: ${m.homeTeam} x ${m.awayTeam}`);
    
    const prompt = `Simule: ${m.homeTeam} vs ${m.awayTeam} (${m.date}). JSON estrito: {homeWinProb, drawProb, awayWinProb, summary, bettingTip, bettingTipCode}`;
    const resp = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: { temperature: 0.1 }
    });
    const parsed = parseGeminiResponse(resp.text);
    if (parsed) {
      results.push({ ...parsed, id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
    }
    await delay(300);
  }
  return results;
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Pesquise no Google pelos 14 jogos da Loteca concurso ${concurso}. 
    Se não encontrar este número exato, retorne os jogos do concurso oficial mais recente. 
    JSON Array: [{homeTeam, awayTeam, date}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const data = parseGeminiResponse(resp.text);
  return Array.isArray(data) ? data.map((m: any, i: number) => ({ ...m, id: (i+1).toString() })) : [];
};

export const runVarAnalysis = async (h: string, a: string, d: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Utilize o Google Search para encontrar "análise de arbitragem", "lances polêmicos" e "polêmicas do VAR" para o jogo ${h} x ${a} ocorrido em ${d}.
  Pesquise especificamente em sites como Globo Esporte (GE), UOL Esporte, ESPN Brasil e Gazeta Esportiva.
  Procure por citações de comentaristas de arbitragem (Ex: PC Oliveira, Sálvio Spínola, Nadine Basttos).
  
  RETORNE UM JSON NO FORMATO: 
  {
    "referee": "Nome do Árbitro",
    "refereeGrade": 0.0,
    "summary": "Resumo das opiniões dos especialistas sobre a arbitragem geral",
    "incidents": [
      {
        "minute": "Tempo do lance",
        "description": "O que aconteceu (ex: Pênalti não marcado)",
        "expertOpinion": "O que os especialistas de notícias disseram sobre o lance",
        "verdict": "CORRECT" | "ERROR" | "CONTROVERSIAL"
      }
    ]
  }`;

  const resp = await ai.models.generateContent({ 
    model: "gemini-3-pro-preview", 
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      temperature: 0.2
    }
  });

  const data = parseGeminiResponse(resp.text);
  if (!data) throw new Error("A IA não conseguiu encontrar detalhes de arbitragem suficientes para este jogo.");
  
  const groundingChunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

  return { ...data, match: `${h} x ${a}`, date: d, sources };
};

export const findMatchesByYear = async (tA: string, tB: string, y: string): Promise<MatchCandidate[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Pesquise no Google por partidas de futebol REAIS entre "${tA}" e "${tB}" no ano de ${y}.
  Busque em tabelas de campeonatos oficiais (Série A, Copa do Brasil, Libertadores, Estaduais).
  IMPORTANTE: Se encontrar jogos, retorne um array JSON. Se NÃO encontrar nada oficial, retorne um array vazio [].
  JSON FORMAT: [{date, homeTeam, awayTeam, score, competition}]`;

  const resp = await ai.models.generateContent({ 
    model: "gemini-3-pro-preview", 
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] }
  });
  
  const data = parseGeminiResponse(resp.text);
  return Array.isArray(data) ? data : [];
};

export const fetchLoteriaPrizeInfo = async (concurso: string): Promise<LoteriaPrizeInfo> => {
    return { concurso, prize14: "R$ 0,00", winners14: 0, prize13: "R$ 0,00", winners13: 0, accumulated: false };
};

export const checkMatchResults = async (matches: BatchMatchInput[]): Promise<BatchMatchInput[]> => matches;
export const runHistoricalBacktest = async (s: number, e: number, p: any): Promise<any[]> => [];
