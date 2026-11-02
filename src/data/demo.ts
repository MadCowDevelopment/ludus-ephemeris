import type { Game, Play, WorkspaceData } from "../types";

const demoGames: Game[] = [
  { id: "copperline", name: "Copperline Express", owned: true, solo: false, defaultDurationHours: 1.4, purchaseDate: "2025-02-14", purchasePrice: 48, rating: 8, wantToPlay: 7 },
  { id: "moss-monuments", name: "Moss & Monuments", owned: true, solo: true, defaultDurationHours: 1.1, purchaseDate: "2024-05-21", purchasePrice: 39, rating: 9, wantToPlay: 8 },
  { id: "solar-dominion", name: "Solar Dominion", owned: true, solo: true, defaultDurationHours: 1.8, purchaseDate: "2023-10-09", purchasePrice: 72, rating: 8, wantToPlay: 6 },
  { id: "paper-kingdoms", name: "Paper Kingdoms", owned: true, solo: false, defaultDurationHours: 0.6, purchaseDate: "2025-07-12", purchasePrice: 24, rating: 7, wantToPlay: 8 },
  { id: "glass-harbor", name: "Glass Harbor", owned: true, solo: true, defaultDurationHours: 0.9, purchaseDate: "2022-03-03", purchasePrice: 34, salePrice: 8, rating: 8, wantToPlay: 5 },
  { id: "cairn-valley", name: "Cairn Valley", owned: true, solo: false, defaultDurationHours: 1.2, purchaseDate: "2026-01-19", purchasePrice: 42, rating: 8, wantToPlay: 9 },
  { id: "orbital-market", name: "Orbital Market", owned: true, solo: true, defaultDurationHours: 1.5, purchaseDate: "2021-08-22", purchasePrice: 56, rating: 9, wantToPlay: 6 },
  { id: "small-hours", name: "Small Hours", owned: true, solo: true, defaultDurationHours: 0.3, purchaseDate: "2025-04-04", purchasePrice: 18, rating: 7, wantToPlay: 8 },
  { id: "fable-flood", name: "Fable of the Flood", owned: true, solo: false, defaultDurationHours: 1.7, purchaseDate: "2020-06-18", purchasePrice: 63, rating: 9, wantToPlay: 4 },
  { id: "lanterns-lyr", name: "Lanterns of Lyr", owned: true, solo: true, defaultDurationHours: 0.8, purchaseDate: "2024-11-02", purchasePrice: 29, rating: 8, wantToPlay: 7 },
  { id: "clockwork-orchard", name: "Clockwork Orchard", owned: true, solo: false, defaultDurationHours: 1, purchaseDate: "2023-04-16", purchasePrice: 36, rating: 7, wantToPlay: 6 },
  { id: "deep-winter", name: "Deep Winter", owned: true, solo: true, defaultDurationHours: 1.3, purchaseDate: "2022-12-01", purchasePrice: 45, rating: 9, wantToPlay: 5 },
  { id: "verdant-signal", name: "Verdant Signal", owned: true, solo: false, defaultDurationHours: 0.7, purchaseDate: "2026-03-28", purchasePrice: 27, rating: 8, wantToPlay: 9 },
  { id: "pines-pyramids", name: "Pines & Pyramids", owned: true, solo: true, defaultDurationHours: 0.5, purchaseDate: "2020-10-13", purchasePrice: 21, rating: 6, wantToPlay: 7 },
  { id: "last-lantern", name: "The Last Lantern", owned: true, solo: false, defaultDurationHours: 2, purchaseDate: "2025-12-22", purchasePrice: 68, rating: 9, wantToPlay: 9 },
];

const yearlyCounts: Record<number, number> = {
  2015: 31, 2016: 48, 2017: 43, 2018: 39, 2019: 45, 2020: 52,
  2021: 63, 2022: 76, 2023: 82, 2024: 69, 2025: 91, 2026: 58,
};

const samplePlays: Play[] = [];
const sampleNow = new Date();
for (const [yearText, count] of Object.entries(yearlyCounts)) {
  const year = Number(yearText);
  for (let index = 0; index < count; index += 1) {
    const game = demoGames[(index * 7 + year) % demoGames.length];
    const maxMonth = year === sampleNow.getUTCFullYear() ? sampleNow.getUTCMonth() : 11;
    const month = (index * 5 + year) % (maxMonth + 1);
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const maxDay = year === sampleNow.getUTCFullYear() && month === sampleNow.getUTCMonth()
      ? sampleNow.getUTCDate()
      : daysInMonth;
    const day = (index * 11 + year) % maxDay + 1;
    const date = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    const durationHours = [0.4, 0.6, 0.8, 1, 1.2, 1.5, 2][(index + year) % 7];
    const solo = game.solo && index % 3 !== 0;
    samplePlays.push({
      id: `sample-${year}-${index}`,
      gameId: game.id,
      gameName: game.name,
      date,
      durationHours,
      playType: solo ? "solo" : "multiplayer",
      score: index % 4 === 0 ? `${58 + ((index * 13) % 44)} pts` : undefined,
      notes: index % 9 === 0 ? "A close finish." : undefined,
      players: solo ? 1 : 2 + (index % 3),
    });
  }
}

export const demoWorkspace: WorkspaceData = {
  games: demoGames,
  plays: samplePlays,
  rankings: [],
  predictions: [],
};

export function readDemoWorkspace(): WorkspaceData {
  try {
    const value = localStorage.getItem("ludus-ephemeris-demo");
    if (!value) return demoWorkspace;
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "games" in parsed &&
      "plays" in parsed &&
      Array.isArray(parsed.games) &&
      Array.isArray(parsed.plays)
    ) {
      return {
        games: parsed.games as Game[],
        plays: parsed.plays as Play[],
        rankings: Array.isArray((parsed as WorkspaceData).rankings) ? (parsed as WorkspaceData).rankings : [],
        predictions: Array.isArray((parsed as WorkspaceData).predictions) ? (parsed as WorkspaceData).predictions : [],
      };
    }
  } catch {
    // A corrupt local preview should not prevent the app from opening.
  }
  return demoWorkspace;
}

export function saveDemoWorkspace(data: WorkspaceData): void {
  localStorage.setItem("ludus-ephemeris-demo", JSON.stringify(data));
}
