
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MatchInput, SimulationResult, TeamMood, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo, HistoricalDrawStats, VarAnalysisResult, MatchCandidate } from "../types";

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Obtém a API Key de forma segura e flexível (EXPORTADA PARA USO NO APP)
export const getApiKey = (): string => {
  // 1. Tenta recuperar do LocalStorage (Inserida pelo usuário na UI) - PRIORIDADE MÁXIMA
  if (typeof localStorage !== 'undefined') {
      const storedKey = localStorage.getItem('sportsim_api_key');
      if (storedKey && storedKey.trim().length > 10) return storedKey.trim();
  }

  // 2. Tenta formato Vite (Padrão para desenvolvimento local .env ou Vercel Environment Variables)
  try {
      const viteEnv = (import.meta as any).env;
      if (viteEnv && viteEnv.VITE_API_KEY) {
        return viteEnv.VITE_API_KEY;
      }
  } catch (e) {
      // Ignora erro se import.meta não existir
  }
  
  // 3. Tenta formato Node/Process (Legado)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  return "";
};

// GLOBAL REQUEST MUTEX
let requestQueue: Promise<any> = Promise.resolve();

async function scheduleRequest<T>(operation: () => Promise<T>): Promise<T> {
  const nextRequest = requestQueue.then(async () => {
    try {
      // Delay global para "resfriar" a API (Paciência Extrema)
      // Reduzido levemente pois o modo Fallback lida com erros, melhorando UX
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
          // Backoff longo para recuperar cota
          const waitTime = initialDelay * Math.pow(2, i) + 70000; // +70s de segurança
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
    // 1. Limpeza agressiva de Markdown
    let cleanText = text
      .replace(/```json/gi, '') // Remove ```json (case insensitive)
      .replace(/```/g, '')      // Remove ``` restantes
      .trim();

    // 2. Extração cirúrgica do objeto ou array JSON
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    
    let startIndex = -1;
    
    // Descobre se começa com { ou [
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex !== -1) {
      // Encontra o final correspondente
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
    // Tenta uma última vez parsear direto caso a limpeza tenha falhado
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

  // Normalização
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
  if (!currentKey) throw new Error("API Key não configurada. Use o botão de configurações (engrenagem) para inserir.");

  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `
    Analista esportivo. Jogo: **${input.homeTeamName}** vs **${input.awayTeamName}**.
    Data: ${input.date}.
    Obs: "${input.observations || ""}".
    
    PESQUISE (Se possível): Lesões, Clima, Arbitragem, Odds.
    Se não conseguir pesquisar, use estatísticas históricas.
    Retorne JSON (Single Match Structure).
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
  if (!currentKey) throw new Error("API Key não configurada.");

  const ai = new GoogleGenAI({ apiKey: currentKey });
  const results: BatchResultItem[] = [];
  const CHUNK_SIZE = 3; // Batch menor para garantir estabilidade

  for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
     const chunk = matches.slice(i, i + CHUNK_SIZE);
     const currentMsg = `Processando bloco ${Math.floor(i/CHUNK_SIZE) + 1} de ${Math.ceil(matches.length/CHUNK_SIZE)}...`;
     
     if (onProgress) onProgress(i, matches.length, currentMsg);
     
     if (i > 0) await delay(2000);

     const matchesList = chunk.map(m => `- ID ${m.id}: ${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join('\n');
     
     const prompt = `
        Analise estatisticamente (Win Probability & Stats):
        ${matchesList}
        Obs: "${observations}"
        
        OUTPUT JSON ARRAY: [ { "id": "ID", "homeTeam": "A", "awayTeam": "B", "homeWinProb": n, "drawProb": n, "awayWinProb": n, "summary": "txt", "weatherText": "txt", "statsSummary": "txt" } ]
      `;

      try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] },
        }), 1, 2000);

        const data = parseGeminiResponse(response.text || "");
        processChunkData(data, results);

      } catch (error) {
        console.warn(`Erro no bloco com Search. Tentando Fallback Offline...`);
        try {
            const fallbackResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt + " ATENÇÃO: Use apenas conhecimento estatístico. Não pesquise na web.",
            }));
            const data = parseGeminiResponse(fallbackResponse.text || "");
            processChunkData(data, results, true);
        } catch (fallbackError) {
             console.error(`Error processing chunk fallback:`, fallbackError);
             chunk.forEach(m => {
                results.push({
                    id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
                    homeWinProb: 33, drawProb: 34, awayWinProb: 33,
                    summary: "Erro na análise (Falha Total).", bettingTip: "Erro", bettingTipCode: "1X2"
                });
            });
        }
      }
  }

  return results;
};

function processChunkData(data: any, resultsArray: BatchResultItem[], isFallback = false) {
    let chunkResults: any[] = [];
    if (Array.isArray(data)) {
        chunkResults = data;
    } else if (data.matches && Array.isArray(data.matches)) {
        chunkResults = data.matches;
    } else {
         chunkResults = [data];
    }
    
    chunkResults.forEach(item => {
       const h = Number(item.homeWinProb) || 33;
       const d = Number(item.drawProb) || 34;
       const a = Number(item.awayWinProb) || 33;

       resultsArray.push({
           id: item.id?.toString() || "0",
           homeTeam: item.homeTeam || "Time A",
           awayTeam: item.awayTeam || "Time B",
           homeWinProb: h,
           drawProb: d,
           awayWinProb: a,
           summary: (item.summary || "Análise estatística.") + (isFallback ? " (Est.)" : ""),
           weatherText: item.weatherText,
           statsSummary: item.statsSummary,
           bettingTip: "", 
           bettingTipCode: "" 
       });
    });
}

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key não configurada.");
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
    throw new Error("Erro ao buscar concurso. Tente novamente em 1 min.");
  }
};

export const fetchLoteriaPrizeInfo = async (concurso: string): Promise<LoteriaPrizeInfo> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key não configurada.");
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
  if (!currentKey) throw new Error("API Key não configurada.");
  
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
  startDraw: number, 
  endDraw: number,
  onProgress: (message: string) => void
): Promise<HistoricalDrawStats[]> => {
  return []; 
};

// --- VAR ANALYSIS FEATURE ---

export const findMatchesByYear = async (teamA: string, teamB: string, year: string): Promise<MatchCandidate[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key não configurada.");
  const ai = new GoogleGenAI({ apiKey: currentKey });

  const prompt = `
    Liste todos os jogos oficiais de futebol entre **${teamA}** e **${teamB}** ocorridos no ano de **${year}**.
    Ignore amistosos se houver jogos oficiais.
    
    RETORNE APENAS UM JSON ARRAY:
    [
      {
        "date": "YYYY-MM-DD",
        "homeTeam": "Nome Time Mandante",
        "awayTeam": "Nome Time Visitante",
        "score": "Placar Final (ex: 2-1)",
        "competition": "Nome do Campeonato (ex: Brasileirão, Copa do Brasil)"
      }
    ]
  `;

  try {
     const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
     }), 2, 2000);

     const parsedData = parseGeminiResponse(response.text || "");
     if (Array.isArray(parsedData)) {
        return parsedData;
     }
     return [];
  } catch (e) {
     console.error("Error finding matches", e);
     throw new Error("Erro ao buscar jogos. Verifique os times e o ano.");
  }
};

export const runVarAnalysis = async (home: string, away: string, date: string): Promise<VarAnalysisResult> => {
   const currentKey = getApiKey();
   if (!currentKey) throw new Error("API Key não configurada.");
   
   const ai = new GoogleGenAI({ apiKey: currentKey });
   
   const prompt = `
     Atue como um especialista em arbitragem de futebol.
     Analise a arbitragem do jogo: **${home} vs ${away}** realizado em ${date}.
     
     TAREFAS:
     1. Pesquise "polêmicas de arbitragem", "erros de arbitragem", "VAR", "Central do Apito".
     2. Procure opiniões de comentaristas (PC Oliveira, Sálvio Spínola, etc).
     
     RETORNE SOMENTE RAW JSON (sem markdown):
     {
       "match": "${home} x ${away}",
       "date": "${date}",
       "referee": "Nome do Árbitro",
       "refereeGrade": number (0-10),
       "summary": "Resumo (Texto curto)",
       "incidents": [
         {
           "minute": "35' 1T",
           "description": "Lance",
           "expertOpinion": "Opinião",
           "verdict": "CORRECT" | "ERROR" | "CONTROVERSIAL"
         }
       ]
     }
   `;
   
   try {
      const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }, // Essencial: Search ativado
      }), 2, 2000);
      
      const parsedData = parseGeminiResponse(response.text || "");
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web?.uri).map((c: any) => ({ uri: c.web.uri, title: c.web.title })) || [];
        
      return {
         match: parsedData.match || `${home} x ${away}`,
         date: parsedData.date || date,
         referee: parsedData.referee || "Não identificado",
         refereeGrade: typeof parsedData.refereeGrade === 'number' ? parsedData.refereeGrade : 5,
         summary: parsedData.summary || "Sem dados suficientes sobre a arbitragem.",
         incidents: Array.isArray(parsedData.incidents) ? parsedData.incidents : [],
         sources
      };
      
   } catch (e) {
     console.warn("VAR Analysis - Search Failed, trying fallback...", e);
     
     // Fallback para conhecimento interno sem pesquisa
     try {
         const fallbackResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt + " IMPORTANTE: Use seu conhecimento histórico interno. NÃO pesquise na web.",
         }), 2, 2000);
         
         const parsedData = parseGeminiResponse(fallbackResponse.text || "");
         return {
            match: parsedData.match || `${home} x ${away}`,
            date: parsedData.date || date,
            referee: parsedData.referee || "Não identificado",
            refereeGrade: typeof parsedData.refereeGrade === 'number' ? parsedData.refereeGrade : 5,
            summary: parsedData.summary || "Análise baseada em histórico (Modo Offline).",
            incidents: Array.isArray(parsedData.incidents) ? parsedData.incidents : [],
            sources: []
         };
     } catch (finalError) {
         console.error("Fatal VAR Error", finalError);
         throw new Error("Não foi possível analisar a arbitragem deste jogo. Verifique se a data está correta ou se o jogo já ocorreu.");
     }
   }
};
