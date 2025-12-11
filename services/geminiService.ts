
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MatchInput, SimulationResult, TeamMood, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo, HistoricalDrawStats, VarAnalysisResult, MatchCandidate } from "../types";

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Obtém a API Key de forma segura e flexível (EXPORTADA PARA USO NO APP)
export const getApiKey = (): string => {
  let key = "";

  // 1. Tenta recuperar do LocalStorage
  if (typeof localStorage !== 'undefined') {
      const storedKey = localStorage.getItem('sportsim_api_key');
      if (storedKey) key = storedKey.trim();
  }

  // 2. Se não achou no storage, tenta ENV
  if (!key) {
      try {
          const viteEnv = (import.meta as any).env;
          if (viteEnv && viteEnv.VITE_API_KEY) {
            key = viteEnv.VITE_API_KEY;
          }
      } catch (e) {
          // Ignora
      }
  }

  // 3. Process env legacy
  if (!key && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    key = process.env.API_KEY;
  }
  
  // VALIDAÇÃO FINAL RIGOROSA
  // Chaves do Google Gemini SEMPRE começam com "AIza"
  if (key && key.startsWith("AIza") && key.length > 20) {
      return key;
  }

  // Se chegou aqui, a chave é inválida ou não existe.
  // Limpa o storage para garantir que o app não tente usar uma chave ruim.
  if (typeof localStorage !== 'undefined' && localStorage.getItem('sportsim_api_key')) {
      localStorage.removeItem('sportsim_api_key');
  }
  
  return "";
};

// GLOBAL REQUEST MUTEX
let requestQueue: Promise<any> = Promise.resolve();

async function scheduleRequest<T>(operation: () => Promise<T>): Promise<T> {
  const nextRequest = requestQueue.then(async () => {
    try {
      await delay(1500); 
      return await operation();
    } catch (err) {
      throw err;
    } 
  });
  
  requestQueue = nextRequest.catch(() => {});
  return nextRequest;
}

// Helper wrapper for API calls with Retry Logic
async function callWithRetry<T>(
  apiCall: () => Promise<T>, 
  retries = 3, 
  initialDelay = 2000 
): Promise<T> {
  
  for (let i = 0; i < retries; i++) {
    try {
      return await scheduleRequest(apiCall);
    } catch (error: any) {
      const isRateLimit = error.status === 429 || 
                          error.status === 503 || 
                          (error.message && (
                            error.message.includes('429') || 
                            error.message.includes('quota') || 
                            error.message.includes('RESOURCE_EXHAUSTED')
                          ));
      
      if (isRateLimit) {
        if (i < retries - 1) {
          const waitTime = initialDelay * Math.pow(2, i) + 70000; 
          console.warn(`⚠️ Cota da API (429). Esperando ${waitTime/1000}s...`);
          await delay(waitTime);
        } else {
           throw error; 
        }
      } else {
        throw error;
      }
    }
  }
  throw new Error("Falha na comunicação com a IA.");
}

const parseGeminiResponse = (text: string): any => {
  if (!text) throw new Error("Resposta da IA vazia.");

  try {
    let cleanText = text
      .replace(/```json/gi, '') 
      .replace(/```/g, '')      
      .trim();

    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    
    let startIndex = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex !== -1) {
      const lastBrace = cleanText.lastIndexOf('}');
      const lastBracket = cleanText.lastIndexOf(']');
      let endIndex = Math.max(lastBrace, lastBracket);
      
      if (endIndex !== -1 && endIndex > startIndex) {
        cleanText = cleanText.substring(startIndex, endIndex + 1);
      }
    }

    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error. Raw text snippet:", text.substring(0, 200));
    try {
        return JSON.parse(text);
    } catch (finalError) {
        throw new Error("Falha ao processar dados da IA (Formato inválido).");
    }
  }
};

const sanitizeSimulationResult = (data: any, input: MatchInput): any => {
  let homeTeamData = data.homeTeam || {};
  let awayTeamData = data.awayTeam || {};
  
  let homeWinProb = typeof homeTeamData.winProbability === 'number' ? homeTeamData.winProbability : 33;
  let awayWinProb = typeof awayTeamData.winProbability === 'number' ? awayTeamData.winProbability : 33;
  let drawProb = typeof data.drawProbability === 'number' ? data.drawProbability : 34;

  let total = homeWinProb + awayWinProb + drawProb;
  if (total <= 0) total = 1; 
  homeWinProb = Math.round((homeWinProb / total) * 100);
  awayWinProb = Math.round((awayWinProb / total) * 100);
  drawProb = 100 - homeWinProb - awayWinProb;

  const rawLineups = data.lineups || {};
  const lineups = {
    home: Array.isArray(rawLineups.home) ? rawLineups.home : [],
    away: Array.isArray(rawLineups.away) ? rawLineups.away : []
  };

  return {
    homeTeam: {
      name: input.homeTeamName,
      winProbability: homeWinProb,
      mood: input.homeMood,
      attackRating: homeTeamData.attackRating || 50,
      defenseRating: homeTeamData.defenseRating || 50,
      possessionEst: homeTeamData.possessionEst || 50,
      aerialAttackRating: homeTeamData.aerialAttackRating || 50, 
      aerialDefenseRating: homeTeamData.aerialDefenseRating || 50,
      recentForm: Array.isArray(homeTeamData.recentForm) ? homeTeamData.recentForm : [],
      keyPlayers: Array.isArray(homeTeamData.keyPlayers) ? homeTeamData.keyPlayers : [],
      statsText: homeTeamData.statsText || "Dados indisponíveis.",
      restDays: typeof homeTeamData.restDays === 'number' ? homeTeamData.restDays : 7
    },
    awayTeam: {
      name: input.awayTeamName,
      winProbability: awayWinProb,
      mood: input.awayMood,
      attackRating: awayTeamData.attackRating || 50,
      defenseRating: awayTeamData.defenseRating || 50,
      possessionEst: awayTeamData.possessionEst || 50,
      aerialAttackRating: awayTeamData.aerialAttackRating || 50, 
      aerialDefenseRating: awayTeamData.aerialDefenseRating || 50, 
      recentForm: Array.isArray(awayTeamData.recentForm) ? awayTeamData.recentForm : [],
      keyPlayers: Array.isArray(awayTeamData.keyPlayers) ? awayTeamData.keyPlayers : [],
      statsText: awayTeamData.statsText || "Dados indisponíveis.",
      restDays: typeof awayTeamData.restDays === 'number' ? awayTeamData.restDays : 7
    },
    predictedScore: data.predictedScore || { home: 0, away: 0 },
    actualScore: data.actualScore,
    drawProbability: drawProb,
    exactScores: Array.isArray(data.exactScores) ? data.exactScores : [],
    lineups: lineups,
    analysisText: data.analysisText || "Análise indisponível.",
    bettingTip: data.bettingTip || "Sem sugestão.",
    bettingTipCode: data.bettingTipCode || "",
    weather: data.weather || { condition: "Desconhecido", temp: "--", probability: "", location: "Estádio", pitchType: "Desconhecido" },
    referee: data.referee || { name: "Não informado", style: "Neutro", avgCards: 0 },
    marketConsensus: data.marketConsensus || ""
  };
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  const currentKey = getApiKey();
  
  if (!currentKey) throw new Error("⛔ ERRO CRÍTICO: Chave API não detectada. Por favor, reconfigure no menu de Login ou Configurações.");

  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `
    Analista esportivo. Jogo: **${input.homeTeamName}** vs **${input.awayTeamName}**.
    Data: ${input.date}.
    Obs: "${input.observations || ""}".
    
    PESQUISE (Se possível): Lesões, Clima, Arbitragem, Odds.
    Retorne JSON.
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    }), 2, 2000); 

    const parsedData = parseGeminiResponse(response.text || "");
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.web?.uri).map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];

    return { ...sanitizeSimulationResult(parsedData, input), sources, matchDate: input.date };
    
  } catch (error: any) {
    console.warn("Falha no Search Grounding ou Cota. Tentando Fallback Offline...", error);
    try {
        const fallbackResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt + "\n\nIMPORTANTE: Atue apenas com seu conhecimento estatístico prévio. NÃO use ferramentas de busca.",
        }), 2, 2000);

        const parsedData = parseGeminiResponse(fallbackResponse.text || "");
        parsedData.marketConsensus = "Modo Offline (Estimativa Pura)";
        parsedData.weather = { condition: "Estimado", temp: "--", probability: "", location: "Local do Jogo", pitchType: "Não verificado" };
        
        return { ...sanitizeSimulationResult(parsedData, input), sources: [], matchDate: input.date };
    } catch (finalError) {
        console.error("Simulation error fatal:", finalError);
        throw finalError;
    }
  }
};

export const runBatchSimulation = async (
  matches: BatchMatchInput[], 
  riskLevel: RiskLevel = RiskLevel.MODERATE,
  observations: string = "",
  onProgress?: (current: number, total: number, message: string) => void
): Promise<BatchResultItem[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key ausente. Configure na tela inicial.");

  const ai = new GoogleGenAI({ apiKey: currentKey });
  const results: BatchResultItem[] = [];
  const CHUNK_SIZE = 3; 

  for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
     const chunk = matches.slice(i, i + CHUNK_SIZE);
     if (onProgress) onProgress(i, matches.length, `Processando lote ${Math.floor(i/CHUNK_SIZE) + 1}...`);
     if (i > 0) await delay(2000);

     const matchesList = chunk.map(m => `- ID ${m.id}: ${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join('\n');
     const prompt = `Analise estatisticamente: ${matchesList} Obs: "${observations}". OUTPUT JSON ARRAY.`;

      try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] },
        }), 1, 2000);
        const data = parseGeminiResponse(response.text || "");
        processChunkData(data, results);
      } catch (error) {
        try {
            const fallbackResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt + " APENAS ESTATÍSTICA PURA. SEM PESQUISA.",
            }));
            const data = parseGeminiResponse(fallbackResponse.text || "");
            processChunkData(data, results, true);
        } catch (fallbackError) {
             chunk.forEach(m => {
                results.push({
                    id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
                    homeWinProb: 33, drawProb: 34, awayWinProb: 33,
                    summary: "Erro na análise.", bettingTip: "Erro", bettingTipCode: "1X2"
                });
            });
        }
      }
  }
  return results;
};

function processChunkData(data: any, resultsArray: BatchResultItem[], isFallback = false) {
    let chunkResults: any[] = [];
    if (Array.isArray(data)) chunkResults = data;
    else if (data.matches && Array.isArray(data.matches)) chunkResults = data.matches;
    else chunkResults = [data];
    
    chunkResults.forEach(item => {
       const h = Number(item.homeWinProb) || 33;
       const d = Number(item.drawProb) || 34;
       const a = Number(item.awayWinProb) || 33;
       resultsArray.push({
           id: item.id?.toString() || "0",
           homeTeam: item.homeTeam || "Time A",
           awayTeam: item.awayTeam || "Time B",
           homeWinProb: h, drawProb: d, awayWinProb: a,
           summary: (item.summary || "Análise.") + (isFallback ? " (Offline)" : ""),
           weatherText: item.weatherText, statsSummary: item.statsSummary,
           bettingTip: "", bettingTipCode: "" 
       });
    });
}

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key ausente.");
  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `Loteca Concurso ${concurso}. Retorne JSON Array: [{ "homeTeam": "A", "awayTeam": "B", "date": "YYYY-MM-DD", "actualHomeScore": n, "actualAwayScore": n }]`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    }));
    const rawData = parseGeminiResponse(response.text || "");
    return rawData.map((item: any, index: number) => ({
      id: (index + 1).toString(),
      homeTeam: item.homeTeam || "",
      awayTeam: item.awayTeam || "",
      date: item.date || new Date().toISOString().split('T')[0],
      actualHomeScore: item.actualHomeScore,
      actualAwayScore: item.actualAwayScore
    }));
  } catch (error) {
    throw new Error("Erro ao buscar concurso. Tente novamente.");
  }
};

export const fetchLoteriaPrizeInfo = async (concurso: string): Promise<LoteriaPrizeInfo> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key ausente.");
  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `Resultado Loteca ${concurso}. JSON: { "prize14": "valor", "winners14": n, "prize13": "valor", "winners13": n, "accumulated": bool }`;
  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    }));
    const data = parseGeminiResponse(response.text || "");
    return {
      concurso: data.concurso || concurso,
      prize14: data.prize14 || "Aguardando...",
      winners14: typeof data.winners14 === 'number' ? data.winners14 : 0,
      prize13: data.prize13 || "Aguardando...",
      winners13: typeof data.winners13 === 'number' ? data.winners13 : 0,
      accumulated: !!data.accumulated
    };
  } catch (e) {
    return { concurso, prize14: "--", winners14: 0, prize13: "--", winners13: 0, accumulated: false };
  }
}

export const checkMatchResults = async (matches: BatchMatchInput[]): Promise<BatchMatchInput[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key ausente.");
  
  const ai = new GoogleGenAI({ apiKey: currentKey });
  const updatedMatches: BatchMatchInput[] = [];
  const CHUNK_SIZE = 5; 

  const processChunk = async (chunkMatches: BatchMatchInput[]): Promise<BatchMatchInput[]> => {
      const list = chunkMatches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join(', ');
      const prompt = `Placares reais para: ${list}. Retorne JSON Array: [{ "id": "1", "actualHomeScore": n, "actualAwayScore": n }]`;
      try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] },
        }));
        const resultsData = parseGeminiResponse(response.text || "");
        return chunkMatches.map(m => {
           const found = Array.isArray(resultsData) ? resultsData.find((r: any) => 
             r.id == m.id || r.homeTeam?.includes(m.homeTeam)
           ) : null;
           if (found && typeof found.actualHomeScore === 'number') {
             return { ...m, actualHomeScore: found.actualHomeScore, actualAwayScore: found.actualAwayScore };
           }
           return m;
        });
      } catch (error) {
        return chunkMatches;
      }
  };

  for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
      if (i > 0) await delay(3000);
      const chunk = matches.slice(i, i + CHUNK_SIZE);
      const processedChunk = await processChunk(chunk);
      updatedMatches.push(...processedChunk);
  }
  return updatedMatches;
};

export const runHistoricalBacktest = async (
  startDraw: number, endDraw: number, onProgress: (message: string) => void
): Promise<HistoricalDrawStats[]> => {
  return []; 
};

export const findMatchesByYear = async (teamA: string, teamB: string, year: string): Promise<MatchCandidate[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key ausente.");
  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `Jogos oficiais ${teamA} vs ${teamB} em ${year}. JSON Array: [{ "date": "YYYY-MM-DD", "homeTeam": "A", "awayTeam": "B", "score": "X-Y", "competition": "Nome" }]`;

  try {
     const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
     }), 2, 2000);
     const parsedData = parseGeminiResponse(response.text || "");
     if (Array.isArray(parsedData)) return parsedData;
     return [];
  } catch (e) {
     throw new Error("Erro ao buscar jogos.");
  }
};

export const runVarAnalysis = async (home: string, away: string, date: string): Promise<VarAnalysisResult> => {
   const currentKey = getApiKey();
   if (!currentKey) throw new Error("API Key ausente.");
   const ai = new GoogleGenAI({ apiKey: currentKey });
   const prompt = `Analise arbitragem de ${home} vs ${away} (${date}). JSON VAR Analysis.`;
   
   try {
      const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }, 
      }), 2, 2000);
      const parsedData = parseGeminiResponse(response.text || "");
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web?.uri).map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];
        
      return {
         match: parsedData.match || `${home} x ${away}`,
         date: parsedData.date || date,
         referee: parsedData.referee || "Não identificado",
         refereeGrade: typeof parsedData.refereeGrade === 'number' ? parsedData.refereeGrade : 5,
         summary: parsedData.summary || "Sem dados.",
         incidents: Array.isArray(parsedData.incidents) ? parsedData.incidents : [],
         sources
      };
   } catch (e) {
     try {
         const fallbackResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt + " OFFLINE MODE. ONLY STATS.",
         }), 2, 2000);
         const parsedData = parseGeminiResponse(fallbackResponse.text || "");
         return {
            match: `${home} x ${away}`, date, referee: "Offline", refereeGrade: 5,
            summary: "Modo Offline.", incidents: [], sources: []
         };
     } catch (finalError) {
         throw new Error("Falha na análise VAR.");
     }
   }
};
