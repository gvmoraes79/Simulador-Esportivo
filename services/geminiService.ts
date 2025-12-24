
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo, VarAnalysisResult, MatchCandidate, HistoricalTrendResult } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getApiKey = (): string => process.env.API_KEY || "";

const parseGeminiResponse = (text: string): any => {
  if (!text) return null;
  
  try {
    // Remove qualquer Markdown de bloco de código
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Localiza o início real do JSON
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    let start = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
    }

    if (start === -1) return null;

    // Localiza o fim real do JSON
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    
    if (end === -1 || end < start) return null;

    const jsonString = cleanText.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Erro crítico ao processar resposta JSON da IA. Texto recebido:", text);
    return null;
  }
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Simule o jogo: ${input.homeTeamName} vs ${input.awayTeamName} em ${input.date}. Risco: ${input.riskLevel}. Use Google Search. Responda apenas com o JSON conforme SimulationResult.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
  });
  const data = parseGeminiResponse(response.text);
  if (!data) throw new Error("Falha na formatação da simulação. Tente novamente.");
  return { ...data, matchDate: input.date, sources: [] };
};

export const runBatchSimulation = async (matches: BatchMatchInput[], risk: RiskLevel, obs: string, onProgress?: (c: number, t: number, m: string) => void): Promise<BatchResultItem[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const results: BatchResultItem[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (onProgress) onProgress(i + 1, matches.length, `Simulando: ${m.homeTeam} x ${m.awayTeam}`);
    const prompt = `Simule: ${m.homeTeam} x ${m.awayTeam}. JSON estrito: {homeWinProb, drawProb, awayWinProb, summary, bettingTip, bettingTipCode}`;
    const resp = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: { temperature: 0.1 } });
    const parsed = parseGeminiResponse(resp.text);
    if (parsed) results.push({ ...parsed, id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam });
    await delay(200);
  }
  return results;
};

export const runHistoricalBacktest = async (team: string, competition: string, year: string): Promise<HistoricalTrendResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Analise o histórico de ${team} em ${competition} (${year}). Use Google Search para resultados REAIS. RETORNE APENAS JSON HistoricalTrendResult.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
  });
  const data = parseGeminiResponse(response.text);
  if (!data) throw new Error("Histórico indisponível no momento.");
  return data;
};

export const runVarAnalysis = async (h: string, a: string, d: string): Promise<VarAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  // Prompt ultra-específico para evitar conversas da IA
  const prompt = `AJA COMO UM ANALISTA DE ARBITRAGEM. Pesquise no Google Search por "lances polêmicos", "decisões VAR" e "crônica de arbitragem" do jogo ${h} x ${a} em ${d}.
  Busque em: ge.globo.com, uol.com.br/esporte, espn.com.br.
  
  REGRAS:
  1. Identifique o árbitro principal.
  2. Liste lances como: gols anulados, pênaltis, expulsões.
  3. Formate rigorosamente como JSON conforme a estrutura VarAnalysisResult.
  4. NÃO escreva texto antes ou depois do JSON.
  
  JSON STRUCTURE:
  {
    "referee": "Nome",
    "refereeGrade": 0,
    "summary": "Resumo analítico",
    "incidents": [{"minute": "X", "description": "...", "expertOpinion": "...", "verdict": "CORRECT"}]
  }`;

  const resp = await ai.models.generateContent({ 
    model: "gemini-3-pro-preview", 
    contents: prompt, 
    config: { tools: [{ googleSearch: {} }], temperature: 0.1 } 
  });

  const data = parseGeminiResponse(resp.text);
  if (!data) {
    console.error("IA Response:", resp.text);
    throw new Error("A IA não conseguiu estruturar as polêmicas deste jogo. Verifique se o jogo realmente teve lances polêmicos registrados na imprensa.");
  }
  
  const groundingChunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

  return { ...data, match: `${h} x ${a}`, date: d, sources: sources.length > 0 ? sources : [] };
};

export const findMatchesByYear = async (tA: string, tB: string, y: string): Promise<MatchCandidate[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Use o Google Search para encontrar resultados de jogos de futebol REAIS entre "${tA}" e "${tB}" no ano de ${y}.
  Retorne um ARRAY JSON de objetos [{date, homeTeam, awayTeam, score, competition}].
  Se não houver confrontos oficiais, retorne apenas um array vazio [].
  IMPORTANTE: Não invente resultados. Use apenas dados de portais de esportes.`;

  const resp = await ai.models.generateContent({ 
    model: "gemini-3-pro-preview", 
    contents: prompt, 
    config: { tools: [{ googleSearch: {} }], temperature: 0 } 
  });
  
  const data = parseGeminiResponse(resp.text);
  return Array.isArray(data) ? data : [];
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const resp = await ai.models.generateContent({ 
    model: "gemini-3-flash-preview", 
    contents: `Jogos Loteca ${concurso}. JSON: [{homeTeam, awayTeam, date}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  const data = parseGeminiResponse(resp.text);
  return Array.isArray(data) ? data.map((m: any, i: number) => ({ ...m, id: (i+1).toString() })) : [];
};
