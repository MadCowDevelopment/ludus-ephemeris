export type PlayType = "solo" | "multiplayer" | "unknown";

export type LegacyValue = string | number | boolean | null;

export interface Game {
  id: string;
  name: string;
  owned: boolean;
  solo?: boolean;
  defaultDurationHours?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  salePrice?: number;
  location?: string;
  rating?: number;
  wantToPlay?: number;
  bggId?: string;
  imageId?: string;
  coverUrl?: string;
  legacy?: Record<string, LegacyValue>;
}

export interface Play {
  id: string;
  gameId?: string;
  gameName: string;
  date: string;
  durationHours: number;
  playType: PlayType;
  score?: string;
  notes?: string;
  players?: number;
  legacy?: Record<string, LegacyValue>;
  source?: { sheet: string; row: number };
}

export interface HistoricalRanking {
  id: string;
  year: number;
  gameName: string;
  rank: number;
  plays?: number;
  hours?: number;
  score?: number;
  source: string;
}

export interface WorkspaceData {
  games: Game[];
  plays: Play[];
  rankings: HistoricalRanking[];
}

export interface GameSummary {
  game: Game;
  plays: number;
  hours: number;
  soloHours: number;
  multiplayerHours: number;
  unclassifiedHours: number;
  averageDuration: number;
  lastPlayed?: string;
  costPerHour?: number;
  pc100Score: number;
}

export interface YearSummary {
  year: number;
  plays: number;
  hours: number;
}
