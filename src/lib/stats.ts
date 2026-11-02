import type { Game, GameSummary, Play, YearSummary, WorkspaceData } from "../types";

export function buildGameSummaries(
  games: Game[],
  plays: Play[],
  now = new Date(),
): GameSummary[] {
  const aggregates = new Map<string, {
    plays: number;
    hours: number;
    soloHours: number;
    multiplayerHours: number;
    unclassifiedHours: number;
    lastPlayed?: string;
  }>();
  const nameToId = new Map(games.map((game) => [normalizeName(game.name), game.id]));

  for (const play of plays) {
    const gameId = play.gameId ?? nameToId.get(normalizeName(play.gameName));
    if (!gameId) continue;
    const aggregate = aggregates.get(gameId) ?? {
      plays: 0, hours: 0, soloHours: 0, multiplayerHours: 0, unclassifiedHours: 0,
    };
    aggregate.plays += 1;
    aggregate.hours += play.durationHours;
    if (play.playType === "solo") aggregate.soloHours += play.durationHours;
    else if (play.playType === "multiplayer") aggregate.multiplayerHours += play.durationHours;
    else aggregate.unclassifiedHours += play.durationHours;
    if (!aggregate.lastPlayed || play.date > aggregate.lastPlayed) aggregate.lastPlayed = play.date;
    aggregates.set(gameId, aggregate);
  }

  return games.map((game) => {
    const aggregate = aggregates.get(game.id) ?? {
      plays: 0, hours: 0, soloHours: 0, multiplayerHours: 0, unclassifiedHours: 0,
    };
    const netCost = (game.purchasePrice ?? 0) - (game.salePrice ?? 0);
    const costPerHour = aggregate.hours > 0 ? netCost / aggregate.hours : undefined;
    const daysSincePlay = aggregate.lastPlayed
      ? Math.max(0, (now.getTime() - new Date(`${aggregate.lastPlayed}T00:00:00`).getTime()) / 86_400_000)
      : 1550;
    const recency = Math.max(1550 - Math.max(daysSincePlay, 90), 0) / 1460;
    const timeScore = Math.min((aggregate.soloHours * recency / 75) * 10, 10);
    const costScore = costPerHour && costPerHour > 0 ? Math.min((1 / costPerHour) * 5, 5) : 0;
    const pc100Score = timeScore * 2 + costScore + (game.rating ?? 0) * 2 + (game.wantToPlay ?? 0) * 3;
    const averageDuration = aggregate.plays > 0 ? aggregate.hours / aggregate.plays : game.defaultDurationHours ?? 0;

    return {
      game,
      ...aggregate,
      averageDuration,
      costPerHour,
      pc100Score,
    };
  });
}

export function summarizeYears(plays: Play[]): YearSummary[] {
  const summaries = new Map<number, YearSummary>();
  for (const play of plays) {
    const year = Number(play.date.slice(0, 4));
    if (!Number.isFinite(year)) continue;
    const summary = summaries.get(year) ?? { year, plays: 0, hours: 0 };
    summary.plays += 1;
    summary.hours += play.durationHours;
    summaries.set(year, summary);
  }
  return [...summaries.values()].sort((a, b) => a.year - b.year);
}

export function summarizeCollection(data: WorkspaceData, now = new Date()) {
  const games = buildGameSummaries(data.games, data.plays, now);
  const years = summarizeYears(data.plays);
  const hours = data.plays.reduce((sum, play) => sum + play.durationHours, 0);
  const purchases = data.games.reduce((sum, game) => sum + (game.purchasePrice ?? 0), 0);
  const unplayed = games.filter((summary) => summary.plays === 0);

  return {
    games,
    years,
    totalGames: data.games.length,
    ownedGames: data.games.filter((game) => game.owned).length,
    totalPlays: data.plays.length,
    totalHours: hours,
    averageDuration: data.plays.length > 0 ? hours / data.plays.length : 0,
    totalPurchaseSpend: purchases,
    unplayedGames: unplayed.length,
    topByPlays: [...games].sort((a, b) => b.plays - a.plays).slice(0, 5),
    topByHours: [...games].sort((a, b) => b.hours - a.hours).slice(0, 5),
    topPc100: [...games].sort((a, b) => b.pc100Score - a.pc100Score).slice(0, 10),
  };
}

export function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
