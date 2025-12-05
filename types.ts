
export enum TeamMood {
  EXCITED = 'Empolgado',
  REGULAR = 'Regular',
  DEMOTIVATED = 'Desmotivado',
}

export enum RiskLevel {
  CONSERVATIVE = 'Conservador',
  CALCULATED = 'Calculado', // Novo: Entre Conservador e Moderado
  MODERATE = 'Moderado',
  AGGRESSIVE = 'Agressivo', // Novo: Entre Moderado e Ousado
  BOLD = 'Ousado',
}

export interface PlayerStats {
  name: string;
  position: string;
  rating: number; // 0-10
  condition?: string; // e.g., "Fit", "Injured", "Returning"
}

export interface ExactScore {
  score: string; // e.g., "2-1"
  probability: number; // 0-100
}

export interface TeamAnalysis {
  name: string;
  winProbability: number; // 0-100
  mood: TeamMood;
  attackRating: number; // 0-100
  defenseRating: number; // 0-100
  possessionEst: number; // 0-100
  aerialAttackRating?: number; // Novo: Força no jogo aéreo ofensivo (0-100)
  aerialDefenseRating?: number; // Novo: Força no jogo aéreo defensivo (0-100)
  keyPlayers: PlayerStats[];
  recentForm: string[]; // e.g., ["W", "D", "L", "W", "W"]
  statsText?: string; // Novo: Texto de aproveitamento (ex: "80% de vitórias em casa")
}

export interface Lineups {
  home: string[];
  away: string[];
}

export interface WeatherInfo {
  condition: string; // "Chuvoso", "Ensolarado", "Nublado"
  temp: string; // "24°C"
  probability: string; // "60% chuva"
  location: string; // "Maracanã, Rio de Janeiro"
  pitchType?: string; // Novo: "Natural", "Sintético", "Híbrido"
}

export interface SimulationResult {
  homeTeam: TeamAnalysis;
  awayTeam: TeamAnalysis;
  predictedScore: {
    home: number;
    away: number;
  };
  actualScore?: { // Placar real caso o jogo já tenha ocorrido
    home: number;
    away: number;
  };
  drawProbability: number;
  exactScores: ExactScore[];
  lineups: Lineups; 
  analysisText: string;
  sources: { uri: string; title: string }[];
  matchDate: string;
  bettingTip: string; // Texto descritivo da sugestão
  bettingTipCode: string; // Código para validação: '1', 'X', '2', '1X', 'X2', '12', 'ALL'
  weather?: WeatherInfo; // Novo campo de clima
}

export interface MatchInput {
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  homeMood: TeamMood;
  awayMood: TeamMood;
  observations?: string;
  riskLevel: RiskLevel;
}

// Interfaces para o modo em lote
export interface BatchMatchInput {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  actualHomeScore?: number; // Placar real (se o jogo já ocorreu)
  actualAwayScore?: number; // Placar real
}

export interface BatchResultItem {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  summary: string; // Breve justificativa
  bettingTip: string; // Sugestão de aposta (Seco, Duplo, Triplo)
  bettingTipCode: string; // Código para validação: '1', 'X', '2', '1X', 'X2', '12', 'ALL'
  weatherText?: string; // Novo: Ex: "Chuva, 22°C"
  statsSummary?: string; // Novo: Ex: "Mandante venceu 4 dos últimos 5"
}

export interface LoteriaPrizeInfo {
  concurso: string;
  prize14: string; // Ex: "R$ 1.500.000,00"
  winners14: number;
  prize13: string;
  winners13: number;
  accumulated: boolean;
}
