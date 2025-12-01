
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, TeamMood, BatchMatchInput, BatchResultItem } from "../types";

const parseGeminiResponse = (text: string): any => {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    const fallbackMatch = text.match(/\{[\s\S]*\}/);
    if (fallbackMatch) {
      return JSON.parse(fallbackMatch[0]);
    }
    // Tenta encontrar array JSON para o batch
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    throw new Error("Formato JSON não encontrado na resposta.");
  } catch (e) {
    console.error("Failed to parse JSON from AI response", e);
    throw new Error("Falha ao processar os dados da simulação via IA.");
  }
};

const sanitizeSimulationResult = (data: any, input: MatchInput): any => {
  return {
    homeTeam: data.homeTeam || {
      name: input.homeTeamName,
      winProbability: 50,
      mood: input.homeMood,
      attackRating: 50,
      defenseRating: 50,
      possessionEst: 50,
      recentForm: [],
      keyPlayers: []
    },
    awayTeam: data.awayTeam || {
      name: input.awayTeamName,
      winProbability: 50,
      mood: input.awayMood,
      attackRating: 50,
      defenseRating: 50,
      possessionEst: 50,
      recentForm: [],
      keyPlayers: []
    },
    predictedScore: data.predictedScore || { home: 0, away: 0 },
    // Strict sanitization for actualScore
    actualScore: (data.actualScore && typeof data.actualScore.home === 'number' && typeof data.actualScore.away === 'number') 
      ? { home: data.actualScore.home, away: data.actualScore.away } 
      : undefined,
    drawProbability: typeof data.drawProbability === 'number' ? data.drawProbability : 0,
    exactScores: Array.isArray(data.exactScores) ? data.exactScores : [],
    lineups: data.lineups || { home: [], away: [] },
    analysisText: data.analysisText || "Análise indisponível.",
    bettingTip: data.bettingTip || "Sem sugestão definida.",
    bettingTipCode: data.bettingTipCode || "1X2",
  };
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Atue como um analista de dados esportivos sênior (foco em Data Science e Apostas Profissionais).
    Tarefa: Analisar e simular o jogo entre **${input.homeTeamName}** (Casa) e **${input.awayTeamName}** (Fora).
    Data do jogo: ${input.date}.
    Mood declarado pelo usuário: ${input.homeTeamName} (${input.homeMood}), ${input.awayTeamName} (${input.awayMood}).
    
    *** CONTEXTO EXTRA FORNECIDO PELO USUÁRIO (CONSIDERAR COM ALTA PRIORIDADE): ***
    "${input.observations || "Nenhuma observação extra fornecida."}"

    INSTRUÇÕES DE PESQUISA AVANÇADA (Google Search):
    1. **Status do Jogo:** Verifique se o jogo JÁ ACONTECEU. Se sim, obtenha o placar final REAL.
    2. **Estatísticas Básicas:** Aproveitamento recente, gols pró/contra, xG (Expected Goals).
    3. **Escalações (Lineups):** Busque as prováveis ou confirmadas.
    4. **VARIÁVEIS DE REALISMO:** H2H, Fator Casa/Fora, Cansaço, Motivação, Clima.

    Retorne JSON ESTRITO com:
    - Probabilidades (win/draw/loss) ajustadas.
    - 5 Placares exatos prováveis (simulação).
    - **actualScore**: SE E SOMENTE SE o jogo já aconteceu, retorne o placar real aqui: { "home": n, "away": n }. Se for futuro, não inclua ou deixe null.
    - Escalações (lineups).
    - **bettingTip**: Sugestão de aposta tática (texto).
    - **bettingTipCode**: Código PADRÃO para validação de aposta:
       - '1' (Vitória Casa)
       - 'X' (Empate)
       - '2' (Vitória Fora)
       - '1X' (Casa ou Empate)
       - 'X2' (Fora ou Empate)
       - '12' (Casa ou Fora)
    - **analysisText**: Texto rico explicando o prognóstico.

    Exemplo JSON:
    \`\`\`json
    {
      "homeTeam": { ... },
      "awayTeam": { ... },
      "predictedScore": { "home": 2, "away": 0 },
      "actualScore": { "home": 1, "away": 1 }, // Apenas se já ocorreu
      "drawProbability": 25,
      "exactScores": [{ "score": "2-0", "probability": 15 }],
      "lineups": { "home": [], "away": [] },
      "bettingTip": "Vitória seca do mandante",
      "bettingTipCode": "1",
      "analysisText": "..."
    }
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const parsedData = parseGeminiResponse(text);
    const sanitizedData = sanitizeSimulationResult(parsedData, input);
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((c: any) => c.web && c.web.uri && c.web.title)
      .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));

    return {
      ...sanitizedData,
      sources,
      matchDate: input.date
    };

  } catch (error) {
    console.error("Simulation error:", error);
    throw error;
  }
};

export const runBatchSimulation = async (matches: BatchMatchInput[]): Promise<BatchResultItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const matchesList = matches.map(m => `- ID: ${m.id} | ${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join('\n');

  const prompt = `
    Atue como especialista em probabilidades de futebol (Syndicate Bettor) focado em LOTERIA ESPORTIVA.
    Analise a lista de jogos abaixo.
    
    **IMPORTANTE: SIMULAÇÃO PREDITIVA**
    Você deve simular as probabilidades baseadas na força dos times antes do jogo.
    
    Para cada jogo, forneça:
    1. bettingTip: Sugestão descritiva (ex: "Seco no Vasco").
    2. bettingTipCode: CÓDIGO TÉCNICO para conferência automática:
       - '1': Casa Vence
       - '2': Fora Vence
       - 'X': Empate
       - '1X': Casa ou Empate (Duplo)
       - 'X2': Fora ou Empate (Duplo)
       - '12': Casa ou Fora
       - 'ALL': Triplo (Qualquer resultado)

    Jogos:
    ${matchesList}

    Retorne um JSON ARRAY puro.
    Estrutura:
    {
      "id": "ID",
      "homeTeam": "Nome",
      "awayTeam": "Nome",
      "homeWinProb": 45,
      "drawProb": 30,
      "awayWinProb": 25,
      "summary": "Motivo resumido.",
      "bettingTip": "Seco no Mandante",
      "bettingTipCode": "1"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    return parseGeminiResponse(text);
  } catch (error) {
    console.error("Batch simulation error:", error);
    throw error;
  }
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Pesquise na internet a lista oficial de jogos da Loteria Esportiva (Brasil) para o concurso número **${concurso}**.
    
    1. Pegue a lista correta dos 14 jogos.
    2. **Busque OBRIGATORIAMENTE o Placar Real (Final Score)** se o jogo já aconteceu.
       - Preencha "actualHomeScore" e "actualAwayScore" com números inteiros.
    
    Retorne APENAS um JSON ARRAY.
    Exemplo de saída:
    [
      { 
        "homeTeam": "Vasco", 
        "awayTeam": "Botafogo", 
        "date": "2024-10-20",
        "actualHomeScore": 1, 
        "actualAwayScore": 1 
      },
      ...
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const rawData = parseGeminiResponse(text);

    return rawData.map((item: any, index: number) => ({
      id: (index + 1).toString(),
      homeTeam: item.homeTeam,
      awayTeam: item.awayTeam,
      date: item.date,
      actualHomeScore: item.actualHomeScore,
      actualAwayScore: item.actualAwayScore
    }));

  } catch (error) {
    console.error("Loteria fetch error:", error);
    throw new Error("Não foi possível encontrar os jogos deste concurso. Verifique o número e tente novamente.");
  }
};

export const checkMatchResults = async (matches: BatchMatchInput[]): Promise<BatchMatchInput[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const matchesList = matches.map(m => `- ID: ${m.id} | ${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join('\n');

  const prompt = `
    Dada a lista de jogos abaixo, pesquise na internet qual foi o PLACAR FINAL (Real Result) de cada um.
    
    Jogos:
    ${matchesList}

    Retorne um JSON ARRAY contendo o ID e o placar.
    Exemplo:
    [
      { "id": "1", "actualHomeScore": 2, "actualAwayScore": 1 },
      { "id": "2", "actualHomeScore": 0, "actualAwayScore": 0 }
    ]
    Se o jogo não ocorreu ou foi adiado, não inclua os scores (ou deixe null).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const resultsData = parseGeminiResponse(text);
    
    // Merge results with input matches
    return matches.map(match => {
      const found = resultsData.find((r: any) => r.id === match.id);
      if (found && typeof found.actualHomeScore === 'number' && typeof found.actualAwayScore === 'number') {
        return { ...match, actualHomeScore: found.actualHomeScore, actualAwayScore: found.actualAwayScore };
      }
      return match;
    });

  } catch (error) {
    console.error("Check results error:", error);
    return matches; // Return original if fail
  }
};
