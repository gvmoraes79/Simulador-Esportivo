
import { GoogleGenAI } from "@google/genai";
import { MatchInput, SimulationResult, TeamMood, BatchMatchInput, BatchResultItem, RiskLevel, LoteriaPrizeInfo } from "../types";

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
  // 1. Extrair valores brutos com defaults seguros
  let homeTeamData = data.homeTeam || {};
  let awayTeamData = data.awayTeam || {};
  
  let homeWinProb = typeof homeTeamData.winProbability === 'number' ? homeTeamData.winProbability : 33;
  let awayWinProb = typeof awayTeamData.winProbability === 'number' ? awayTeamData.winProbability : 33;
  let drawProb = typeof data.drawProbability === 'number' ? data.drawProbability : 34;
  
  const bettingTipCode = (data.bettingTipCode || "").toString().toUpperCase();

  // 2. FORCEFUL CONSISTENCY CHECK (CORREÇÃO AGRESSIVA)
  if (bettingTipCode === '1') {
    const minWinProb = 45;
    if (homeWinProb < minWinProb || homeWinProb <= awayWinProb + 5) {
        homeWinProb = Math.max(homeWinProb, minWinProb, awayWinProb + 15);
        const remaining = 100 - homeWinProb;
        drawProb = Math.floor(remaining * 0.6);
        awayWinProb = remaining - drawProb;
    }
  } else if (bettingTipCode === '2') {
    const minWinProb = 45;
    if (awayWinProb < minWinProb || awayWinProb <= homeWinProb + 5) {
        awayWinProb = Math.max(awayWinProb, minWinProb, homeWinProb + 15);
        const remaining = 100 - awayWinProb;
        drawProb = Math.floor(remaining * 0.6);
        homeWinProb = remaining - drawProb;
    }
  } else if (bettingTipCode === 'X') {
     if (drawProb < 35) {
        drawProb = 40;
        const remaining = 60;
        homeWinProb = remaining / 2;
        awayWinProb = remaining / 2;
     }
  }

  // 3. Normalizar para 100%
  const total = homeWinProb + awayWinProb + drawProb;
  if (total > 0 && Math.abs(total - 100) > 0) {
    homeWinProb = Math.round((homeWinProb / total) * 100);
    awayWinProb = Math.round((awayWinProb / total) * 100);
    drawProb = 100 - homeWinProb - awayWinProb;
  }

  // Strict Lineup Sanitization
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
      statsText: homeTeamData.statsText || "Dados indisponíveis."
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
      statsText: awayTeamData.statsText || "Dados indisponíveis."
    },
    predictedScore: data.predictedScore || { home: 0, away: 0 },
    actualScore: (data.actualScore && typeof data.actualScore.home === 'number' && typeof data.actualScore.away === 'number') 
      ? { home: data.actualScore.home, away: data.actualScore.away } 
      : undefined,
    drawProbability: drawProb,
    exactScores: Array.isArray(data.exactScores) ? data.exactScores : [],
    lineups: lineups,
    analysisText: data.analysisText || "Análise indisponível.",
    bettingTip: data.bettingTip || "Sem sugestão definida.",
    bettingTipCode: data.bettingTipCode || "",
    weather: data.weather || { condition: "Desconhecido", temp: "--", probability: "", location: "Estádio", pitchType: "Desconhecido" }
  };
};

export const runSimulation = async (input: MatchInput): Promise<SimulationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Atue como um analista de dados esportivos sênior.
    Tarefa: Analisar e simular o jogo entre **${input.homeTeamName}** (Casa) e **${input.awayTeamName}** (Fora).
    Data do jogo: ${input.date}.
    Mood: ${input.homeTeamName} (${input.homeMood}), ${input.awayTeamName} (${input.awayMood}).
    
    *** CONFIGURAÇÃO DE ESTRATÉGIA: ***
    PERFIL DE RISCO: **${input.riskLevel}**.
    CONTEXTO EXTRA: "${input.observations || "Nenhuma observação extra."}"

    INSTRUÇÕES DE PESQUISA AVANÇADA (Google Search):
    1. **Previsão do Tempo e LOCAL (CRUCIAL):** 
       - Identifique o estádio.
       - **TIPO DE GRAMADO (IMPORTANTE):** O gramado é NATURAL ou SINTÉTICO?
       - Verifique se o Time Visitante tem histórico ruim jogando em gramados sintéticos (caso o estádio seja sintético). Se sim, aumente a probabilidade do Mandante.
       - Busque a previsão do tempo exata.

    2. **Aproveitamento e Estatísticas:** Pesquise o desempenho recente.
    3. **ESCALAÇÕES E DESFALQUES (CRÍTICO - PRIORIDADE MÁXIMA):**
       - Pesquise ativamente por: "Desfalques ${input.homeTeamName} hoje", "Lista de relacionados ${input.homeTeamName}", "Lesionados ${input.awayTeamName}".
       - **VERIFICAÇÃO DE LESÃO:** Se houver notícias de que um jogador chave está lesionado (Ex: Goleiro titular, Artilheiro), **NÃO O ESCALE**.
       - Monte o 'lineups' com os 11 que realmente devem ir a campo baseados nas notícias das últimas 24h.
    
    4. **ANÁLISE DE JOGO AÉREO E BOLA PARADA (NOVO):**
       - Analise a altura média e força aérea.

    Retorne JSON ESTRITO com:
    - Probabilidades ajustadas (Considerando Fator Gramado e Desfalques).
    - 5 Placares exatos prováveis.
    - **weather**: { "condition": "...", "temp": "...", "probability": "...", "location": "Estádio", "pitchType": "Natural/Sintético" }
    - **homeTeam.statsText**: Frase resumindo o aproveitamento.
    - **awayTeam.statsText**: Frase resumindo o aproveitamento.
    - **homeTeam.aerialAttackRating**: 0-100.
    - **homeTeam.aerialDefenseRating**: 0-100.
    - **awayTeam.aerialAttackRating**: 0-100.
    - **awayTeam.aerialDefenseRating**: 0-100.
    - **actualScore**: { "home": n, "away": n } (Se jogo já ocorreu).
    - **lineups**: { "home": [...], "away": [...] }.
    - **bettingTip** e **bettingTipCode**.
    - **analysisText**: Texto rico explicando o prognóstico, mencionando O GRAMADO (se isso influencia) e desfalques.

    CRITICAL CONSISTENCY CHECK:
    O 'bettingTipCode' DEVE corresponder EXATAMENTE ao time mencionado em 'bettingTip'.

    Exemplo JSON:
    \`\`\`json
    {
      "homeTeam": { "winProbability": 50, "statsText": "Forte no sintético", "aerialAttackRating": 85, "aerialDefenseRating": 60 },
      "awayTeam": { "winProbability": 20, "statsText": "Não vence fora há 3 jogos", "aerialAttackRating": 40, "aerialDefenseRating": 45 },
      "weather": { "condition": "Chuva Forte", "temp": "22°C", "probability": "90%", "location": "Allianz Parque", "pitchType": "Sintético" },
      "predictedScore": { "home": 2, "away": 0 },
      "bettingTip": "Vitória do Mandante",
      "bettingTipCode": "1",
      "lineups": { "home": ["Player 1", ...], "away": ["Player A", ...] }
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

export const runBatchSimulation = async (
  matches: BatchMatchInput[], 
  riskLevel: RiskLevel = RiskLevel.MODERATE, 
  observations: string = "",
  onProgress?: (current: number, total: number, message: string) => void
): Promise<BatchResultItem[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY not found.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const results: BatchResultItem[] = [];
  
  // MUDANÇA: Processamento sequencial 1 a 1 para MÁXIMA PRECISÃO
  for (let i = 0; i < matches.length; i++) {
     const match = matches[i];
     const currentMsg = `Analisando jogo ${i + 1} de ${matches.length}: ${match.homeTeam} x ${match.awayTeam}...`;
     
     if (onProgress) {
        onProgress(i + 1, matches.length, currentMsg);
     }

     const prompt = `
        Atue como especialista em probabilidades de futebol (Syndicate Bettor).
        Analise o jogo: **${match.homeTeam} (Casa) vs ${match.awayTeam} (Fora)**.
        Data: ${match.date}.
        
        PERFIL DE RISCO: **${riskLevel}**.
        OBSERVAÇÕES GERAIS: "${observations}".

        *** MODO SIMULAÇÃO DE ESTRATÉGIA (BLIND TEST) ***
        Mesmo que a data do jogo seja no passado, IGNORE O RESULTADO FINAL se você o souber.
        Analise APENAS com base nos dados PRÉ-JOGO.

        INSTRUÇÕES DE ALTA PRECISÃO (Search Grounding):
        1. **MUST WIN:** Algum time precisa desesperadamente vencer?
        2. **DESFALQUES RECENTES:** Pesquise "desfalques ${match.homeTeam}" e "desfalques ${match.awayTeam}" para HOJE.
        3. **FATOR CASA/GRAMADO:** O time da casa é muito forte em seu estádio? O gramado é sintético?

        Retorne JSON ÚNICO para este jogo:
        {
            "id": "${match.id}",
            "homeTeam": "${match.homeTeam}",
            "awayTeam": "${match.awayTeam}",
            "homeWinProb": 45,
            "drawProb": 30,
            "awayWinProb": 25,
            "summary": "Explicação detalhada em 1 frase.",
            "bettingTip": "Seco no Mandante",
            "bettingTipCode": "1",
            "weatherText": "Nublado, 24°C",
            "statsSummary": "Mandante invicto em casa"
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
        const data = parseGeminiResponse(text);
        
        // Validação se é array ou objeto único
        if (Array.isArray(data)) {
           results.push(data[0]);
        } else {
           results.push(data);
        }

      } catch (error) {
        console.error(`Error processing match ${match.id}:`, error);
        results.push({
           id: match.id,
           homeTeam: match.homeTeam,
           awayTeam: match.awayTeam,
           homeWinProb: 33,
           drawProb: 34,
           awayWinProb: 33,
           summary: "Erro na análise individual deste jogo.",
           bettingTip: "Sem sugestão",
           bettingTipCode: "1X2",
           weatherText: "--",
           statsSummary: "--"
        });
      }
  }

  return results;
};

export const fetchLoteriaMatches = async (concurso: string): Promise<BatchMatchInput[]> => {
  if (!process.env.API_KEY) throw new Error("API_KEY not found.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Pesquise na internet a lista oficial de jogos da Loteria Esportiva (Brasil) para o concurso número **${concurso}**.
    Busque OBRIGATORIAMENTE o Placar Real se o jogo já aconteceu.
    Retorne JSON ARRAY: [ { "homeTeam": "A", "awayTeam": "B", "date": "YYYY-MM-DD", "actualHomeScore": n, "actualAwayScore": n }, ... ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    const text = response.text || "";
    const rawData = parseGeminiResponse(text);
    return rawData.map((item: any, index: number) => ({
      id: (index + 1).toString(),
      homeTeam: item.homeTeam || "",
      awayTeam: item.awayTeam || "",
      date: item.date || new Date().toISOString().split('T')[0],
      actualHomeScore: item.actualHomeScore,
      actualAwayScore: item.actualAwayScore
    }));
  } catch (error) {
    console.error("Loteria fetch error:", error);
    throw new Error("Não foi possível encontrar os jogos deste concurso.");
  }
};

export const fetchLoteriaPrizeInfo = async (concurso: string): Promise<LoteriaPrizeInfo> => {
  if (!process.env.API_KEY) throw new Error("API_KEY required");
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Realize uma pesquisa detalhada sobre o **Resultado Oficial da Loteca concurso ${concurso}** (Loteria Esportiva Caixa).
    
    INFORMAÇÕES OBRIGATÓRIAS A EXTRAIR:
    1. O concurso já foi apurado? (accumulated).
    2. Quantos ganhadores para 14 acertos? Qual o valor exato do prêmio?
    3. Quantos ganhadores para 13 acertos? Qual o valor exato do prêmio?
    
    Se acumulou, o número de ganhadores de 14 acertos é 0 e o valor deve indicar "ACUMULOU".
    
    Retorne este JSON exato:
    {
      "concurso": "${concurso}",
      "prize14": "R$ Valor ou ACUMULOU",
      "winners14": número (int),
      "prize13": "R$ Valor",
      "winners13": número (int),
      "accumulated": boolean
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    const text = response.text || "";
    const data = parseGeminiResponse(text);
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
  if (!process.env.API_KEY) throw new Error("API_KEY not found.");
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const updatedMatches: BatchMatchInput[] = [];
  const CHUNK_SIZE = 5;

  const processChunk = async (chunkMatches: BatchMatchInput[]): Promise<BatchMatchInput[]> => {
      const matchesList = chunkMatches.map(m => `- ID: ${m.id} | ${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join('\n');
      const prompt = `
        Pesquise PLACAR FINAL (Real Result) de cada jogo abaixo.
        Jogos: ${matchesList}
        Retorne JSON ARRAY: [{ "id": "ID", "actualHomeScore": 2, "actualAwayScore": 1 }, ...]
      `;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] },
        });
        const text = response.text || "";
        const resultsData = parseGeminiResponse(text);
        return chunkMatches.map(match => {
          const found = resultsData.find((r: any) => r.id === match.id);
          if (found && typeof found.actualHomeScore === 'number' && typeof found.actualAwayScore === 'number') {
            return { ...match, actualHomeScore: found.actualHomeScore, actualAwayScore: found.actualAwayScore };
          }
          return match;
        });
      } catch (error) {
        return chunkMatches;
      }
  };

  for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
      const chunk = matches.slice(i, i + CHUNK_SIZE);
      const processedChunk = await processChunk(chunk);
      updatedMatches.push(...processedChunk);
  }
  return updatedMatches;
};
