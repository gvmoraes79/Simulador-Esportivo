
export enum TeamMood {
  EXCITED = 'Empolgado',
  REGULAR = 'Regular',
  DEMOTIVATED = 'Desmotivado',
}

export enum RiskLevel {
  CONSERVATIVE = 'Conservador',
  CALCULATED = 'Calculado', 
  MODERATE = 'Moderado',
  AGGRESSIVE = 'Agressivo', 
  BOLD = 'Ousado',
}

export interface PlayerStats {
  name: string;
  position: string;
  rating: number; 
  condition?: string; 
}

export interface ExactScore {
  score: string; 
  probability: number; 
}

export interface TeamAnalysis {
  name: string;
  winProbability: number; 
  mood: TeamMood;
  attackRating: number; 
  defenseRating: number; 
  possessionEst: number; 
  aerialAttackRating?: number; 
  aerialDefenseRating?: number; 
  keyPlayers: PlayerStats[];
  recentForm: string[]; 
  statsText?: string; 
  restDays?: number; 
}

export interface Lineups {
  home: string[];
  away: string[];
}

export interface WeatherInfo {
  condition: string; 
  temp: string; 
  probability: string; 
  location: string; 
  pitchType?: string; 
}

export interface RefereeInfo {
  name: string;
  style: string; 
  avgCards: number; 
}

export interface SimulationResult {
  homeTeam: TeamAnalysis;
  awayTeam: TeamAnalysis;
  predictedScore: {
    home: number;
    away: number;
  };
  actualScore?: { 
    home: number;
    away: number;
  };
  drawProbability: number;
  exactScores: ExactScore[];
  lineups: Lineups; 
  analysisText: string;
  sources: { uri: string; title: string }[];
  matchDate: string;
  bettingTip: string; 
  bettingTipCode: string; 
  weather?: WeatherInfo; 
  referee?: RefereeInfo; 
  marketConsensus?: string; 
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

export interface BatchMatchInput {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  actualHomeScore?: number; 
  actualAwayScore?: number; 
}

export interface BatchResultItem {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  summary: string; 
  weatherText?: string; 
  statsSummary?: string; 
  bettingTip: string; 
  bettingTipCode: string; 
}

export interface LoteriaPrizeInfo {
  concurso: string;
  prize14: string; 
  winners14: number;
  prize13: string;
  winners13: number;
  accumulated: boolean;
}

export interface HistoricalTrendResult {
  team: string;
  period: string;
  winRate: number;
  drawRate: number;
  lossRate: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  tacticalPattern: string;
  consistencyScore: number;
  bestStrategy: RiskLevel;
  recentMatches: {
    opponent: string;
    score: string;
    result: 'W' | 'D' | 'L';
    competition: string;
  }[];
}

export interface VarIncident {
  minute: string;
  description: string;
  expertOpinion: string;
  verdict: 'CORRECT' | 'ERROR' | 'CONTROVERSIAL';
}

export interface VarAnalysisResult {
  match: string;
  date: string;
  referee: string;
  refereeGrade: number;
  summary: string;
  incidents: VarIncident[];
  sources: { title: string; uri: string }[];
}

export interface MatchCandidate {
  date: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  competition: string;
}
