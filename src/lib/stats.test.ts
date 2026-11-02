import { describe, expect, it } from "vitest";
import type { Game, Play } from "../types";
import { buildGameSummaries, normalizeName, summarizeCollection, summarizeYears } from "./stats";

const games: Game[] = [
  { id: "g1", name: "Catan", owned: true, purchasePrice: 40, rating: 8, wantToPlay: 7 },
  { id: "g2", name: "Wingspan", owned: false, purchasePrice: 60 },
];

const plays: Play[] = [
  { id: "p1", gameId: "g1", gameName: "Catan", date: "2025-01-02", durationHours: 2, playType: "solo" },
  { id: "p2", gameName: " cAtAn ", date: "2025-01-02", durationHours: 3, playType: "multiplayer" },
  { id: "p3", gameName: "Wingspan", date: "2024-06-05", durationHours: 1.5, playType: "unknown" },
];

describe("collection statistics", () => {
  it("aggregates plays by linked id or normalized title without mixing play types", () => {
    const [catan, wingspan] = buildGameSummaries(games, plays, new Date("2025-02-01T00:00:00Z"));

    expect(catan).toMatchObject({
      plays: 2,
      hours: 5,
      soloHours: 2,
      multiplayerHours: 3,
      unclassifiedHours: 0,
      averageDuration: 2.5,
      lastPlayed: "2025-01-02",
      costPerHour: 8,
    });
    expect(catan.pc100Score).toBeGreaterThan(0);
    expect(wingspan).toMatchObject({
      plays: 1,
      hours: 1.5,
      soloHours: 0,
      multiplayerHours: 0,
      unclassifiedHours: 1.5,
      costPerHour: 40,
    });
  });

  it("summarizes years and collection totals from play records", () => {
    const summary = summarizeCollection({ games, plays, rankings: [], predictions: [] });

    expect(summarizeYears(plays)).toEqual([
      { year: 2024, plays: 1, hours: 1.5 },
      { year: 2025, plays: 2, hours: 5 },
    ]);
    expect(summary).toMatchObject({
      totalGames: 2,
      ownedGames: 1,
      totalPlays: 3,
      totalHours: 6.5,
      totalPurchaseSpend: 100,
      unplayedGames: 0,
    });
    expect(summary.topByPlays[0].game.name).toBe("Catan");
  });

  it("normalizes title whitespace and case", () => {
    expect(normalizeName("  Ticket   TO Ride ")).toBe("ticket to ride");
  });
});
