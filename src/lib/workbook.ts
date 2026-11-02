import type ExcelJS from "exceljs";
import type {
  Game,
  HistoricalRanking,
  LegacyValue,
  Play,
  PlayType,
  Prediction,
  WorkspaceData,
} from "../types";
import { normalizeName } from "./stats";

export interface WorkbookImport {
  data: WorkspaceData;
  sourceName: string;
  duplicateGameNames: string[];
  missingCatalogGames: string[];
  skippedPlayRows: Array<{ sheet: string; row: number; gameName: string; reason: string }>;
  years: number[];
}

type ParsedCell = LegacyValue | Date | undefined;

function readCell(value: ExcelJS.CellValue): ParsedCell {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) return undefined;
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("");
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
    return undefined;
  }
  return value;
}

function formatDate(value: ParsedCell): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function asNumber(value: ParsedCell): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: ParsedCell): boolean | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1", "solo"].includes(normalized)) return true;
  if (["no", "false", "0", "multi", "multiplayer"].includes(normalized)) return false;
  return undefined;
}

function makeId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function legacyFields(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  headers: string[],
  omitted: Set<string>,
): Record<string, LegacyValue> {
  const legacy: Record<string, LegacyValue> = {};
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const rawValue = readCell(worksheet.getCell(rowNumber, column).value);
    const value = rawValue instanceof Date ? rawValue.toISOString().slice(0, 10) : rawValue;
    if (value === undefined || value === null || value === "") continue;
    const header = headers[column - 1]?.trim() || `Column ${column}`;
    if (!omitted.has(header.toLowerCase())) legacy[header] = value;
  }
  return legacy;
}

function parseCatalog(workbook: ExcelJS.Workbook): { games: Game[]; duplicates: string[] } {
  const sheet = workbook.getWorksheet("Overview");
  if (!sheet) return { games: [], duplicates: [] };
  const headers = Array.from({ length: sheet.columnCount }, (_, index) =>
    String(readCell(sheet.getCell(1, index + 1).value) ?? ""),
  );
  const headerIndex = new Map(headers.map((header, index) => [header.trim().toLowerCase(), index + 1]));
  const cell = (row: number, header: string) => {
    const column = headerIndex.get(header.toLowerCase());
    return column ? readCell(sheet.getCell(row, column).value) : undefined;
  };
  const games: Game[] = [];
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  const omitted = new Set([
    "name", "solo", "duration", "purchased", "purchase prize", "sell prize",
    "location", "rating", "want to play", "bgg id", "image id", "microbadge",
  ]);
  const idColumn = headerIndex.get("name");
  if (!idColumn) return { games, duplicates: [] };

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const nameValue = readCell(sheet.getCell(rowNumber, idColumn).value);
    if (typeof nameValue !== "string" || !nameValue.trim()) continue;
    const name = nameValue.trim();
    const normalized = normalizeName(name);
    const occurrence = (seen.get(normalized) ?? 0) + 1;
    if (occurrence > 1) duplicates.add(name);
    seen.set(normalized, occurrence);
    const locationValue = cell(rowNumber, "Location");
    const location = typeof locationValue === "string" ? locationValue : undefined;
    games.push({
      id: `${makeId("game", normalized)}${occurrence > 1 ? `-${occurrence}` : ""}`,
      name,
      owned: location?.trim().toLowerCase() !== "sold",
      solo: asBoolean(cell(rowNumber, "Solo")),
      defaultDurationHours: asNumber(cell(rowNumber, "Duration")),
      purchaseDate: formatDate(cell(rowNumber, "Purchased")),
      purchasePrice: asNumber(cell(rowNumber, "Purchase Prize")),
      salePrice: asNumber(cell(rowNumber, "Sell Prize")),
      location,
      rating: asNumber(cell(rowNumber, "Rating")),
      wantToPlay: asNumber(cell(rowNumber, "Want to play")),
      bggId: String(cell(rowNumber, "BGG ID") ?? "") || undefined,
      imageId: String(cell(rowNumber, "Image ID") ?? "") || undefined,
      legacy: legacyFields(sheet, rowNumber, headers, omitted),
    });
  }
  return { games, duplicates: [...duplicates].sort((a, b) => a.localeCompare(b)) };
}

function classifyPlay(row: Record<string, LegacyValue>): PlayType {
  for (const [key, value] of Object.entries(row)) {
    if (["solo", "play type", "playtype"].includes(key.trim().toLowerCase())) {
      const parsed = asBoolean(value);
      if (parsed === true) return "solo";
      if (parsed === false) return "multiplayer";
    }
    const field = key.trim().toLowerCase();
    if (["players", "player count"].includes(field)) {
      const count = asNumber(value);
      if (count !== undefined && count > 0) return count === 1 ? "solo" : "multiplayer";
      if (field === "players" && typeof value === "string" && value.trim()) return "multiplayer";
    }
    if (field === "opponentidentity" && typeof value === "string") {
      const identity = value.trim().toLowerCase();
      if (identity && !["none", "solo", "unknown", "-"].includes(identity)) return "multiplayer";
    }
  }
  return "unknown";
}

function parsePlays(workbook: ExcelJS.Workbook): {
  plays: Play[];
  years: number[];
  skippedRows: WorkbookImport["skippedPlayRows"];
} {
  const plays: Play[] = [];
  const years = new Set<number>();
  const skippedRows: WorkbookImport["skippedPlayRows"] = [];
  for (const sheet of workbook.worksheets) {
    if (!/^\d{4}$/.test(sheet.name)) continue;
    const year = Number(sheet.name);
    const headers = Array.from({ length: sheet.columnCount }, (_, index) =>
      String(readCell(sheet.getCell(1, index + 1).value) ?? ""),
    );
    const normalized = headers.map((header) => header.trim().toLowerCase());
    const dateColumn = normalized.indexOf("date") + 1;
    const nameColumn = normalized.indexOf("name") + 1;
    const durationColumn = normalized.indexOf("duration") + 1;
    if (!dateColumn || !nameColumn || !durationColumn) continue;

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const nameValue = readCell(sheet.getCell(rowNumber, nameColumn).value);
      const durationHours = asNumber(readCell(sheet.getCell(rowNumber, durationColumn).value));
      const date = formatDate(readCell(sheet.getCell(rowNumber, dateColumn).value));
      if (typeof nameValue !== "string" || !nameValue.trim()) continue;
      const gameName = nameValue.trim();
      const reason = !date
        ? "Missing or unreadable date"
        : durationHours === undefined || durationHours <= 0
          ? "Missing or invalid duration"
          : undefined;
      if (reason) {
        skippedRows.push({ sheet: sheet.name, row: rowNumber, gameName, reason });
        continue;
      }
      if (!date || durationHours === undefined) continue;
      const legacy = legacyFields(sheet, rowNumber, headers, new Set(["date", "name", "duration"]));
      const lowerKeys = new Map(Object.entries(legacy).map(([key, value]) => [key.toLowerCase(), value]));
      const description = lowerKeys.get("description");
      const score = lowerKeys.get("score");
      const players = asNumber(lowerKeys.get("players") ?? lowerKeys.get("player count"));
      plays.push({
        id: `import-${sheet.name}-${rowNumber}`,
        gameName,
        date,
        durationHours,
        playType: classifyPlay(legacy),
        notes: typeof description === "string" ? description : undefined,
        score: score === undefined ? undefined : String(score),
        players,
        legacy,
        source: { sheet: sheet.name, row: rowNumber },
      });
      years.add(year);
    }
  }
  return { plays, years: [...years].sort((a, b) => a - b), skippedRows };
}

function parseHistoricalRankings(workbook: ExcelJS.Workbook): HistoricalRanking[] {
  const rankings: HistoricalRanking[] = [];
  const pc100 = workbook.getWorksheet("PC100");
  if (pc100) {
    for (let column = 1; column < pc100.columnCount; column += 1) {
      const heading = readCell(pc100.getCell(1, column).value);
      const match = typeof heading === "string" ? heading.match(/^PC100\s*-\s*(\d{4})$/i) : null;
      if (!match) continue;
      const year = Number(match[1]);
      for (let row = 2; row <= pc100.rowCount; row += 1) {
        const gameName = readCell(pc100.getCell(row, column).value);
        const score = asNumber(readCell(pc100.getCell(row, column + 1).value));
        if (typeof gameName !== "string" || !gameName.trim()) continue;
        rankings.push({
          id: `pc100-${year}-${makeId("game", normalizeName(gameName))}`,
          year,
          gameName: gameName.trim(),
          rank: row - 1,
          score,
          source: "PC100",
        });
      }
    }
  }

  const fame = workbook.getWorksheet("Fame");
  if (fame) {
    for (let row = 1; row <= fame.rowCount; row += 1) {
      const heading = readCell(fame.getCell(row, 16).value);
      const match = typeof heading === "string" ? heading.match(/^Top 25 plays\s+(\d{4})$/i) : null;
      if (!match) continue;
      const year = Number(match[1]);
      for (let offset = 1; offset <= 25; offset += 1) {
        const entryRow = row + offset;
        const countName = readCell(fame.getCell(entryRow, 16).value);
        const count = asNumber(readCell(fame.getCell(entryRow, 17).value));
        const hoursName = readCell(fame.getCell(entryRow, 18).value);
        const hours = asNumber(readCell(fame.getCell(entryRow, 19).value));
        if (typeof countName === "string" && countName.trim()) {
          rankings.push({
            id: `fame-count-${year}-${offset}`,
            year,
            gameName: countName.trim(),
            rank: offset,
            plays: count,
            source: "Fame: plays",
          });
        }
        if (typeof hoursName === "string" && hoursName.trim()) {
          rankings.push({
            id: `fame-hours-${year}-${offset}`,
            year,
            gameName: hoursName.trim(),
            rank: offset,
            hours,
            source: "Fame: hours",
          });
        }
      }
    }
  }
  return rankings;
}

function parsePredictions(workbook: ExcelJS.Workbook): Prediction[] {
  const sheet = workbook.getWorksheet("Predictions");
  if (!sheet) return [];
  const predictions: Prediction[] = [];
  let year: number | undefined;
  let rank = 0;
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    const value = readCell(sheet.getCell(row, 1).value);
    if (typeof value !== "string" || !value.trim()) continue;
    const headerYear = value.match(/\b(20\d{2})\b/);
    if (/prediction|most played/i.test(value) && headerYear) {
      year = Number(headerYear[1]);
      rank = 0;
      continue;
    }
    if (year === undefined) continue;
    const entry = value.trim().match(/^(?:(\d+)\s+)?(.+?)(?:\s+(\d+))?$/);
    if (!entry || !entry[2].trim()) continue;
    rank += 1;
    const listedRank = entry[1] ? Number(entry[1]) : rank;
    const predictedPlays = entry[3] ? Number(entry[3]) : undefined;
    predictions.push({
      id: `prediction-${year}-${row}`,
      year,
      gameName: entry[2].trim(),
      rank: listedRank,
      predictedPlays,
      sourceText: value,
    });
  }
  return predictions;
}

export async function readWorkbook(file: File): Promise<WorkbookImport> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const catalog = parseCatalog(workbook);
  const playData = parsePlays(workbook);
  const nameSet = new Set(catalog.games.map((game) => normalizeName(game.name)));
  const missingCatalogGames = [...new Set(
    playData.plays
      .map((play) => play.gameName)
      .filter((name) => !nameSet.has(normalizeName(name))),
  )].sort((a, b) => a.localeCompare(b));

  return {
    data: {
      games: catalog.games,
      plays: playData.plays,
      rankings: parseHistoricalRankings(workbook),
      predictions: parsePredictions(workbook),
    },
    sourceName: file.name,
    duplicateGameNames: catalog.duplicates,
    missingCatalogGames,
    skippedPlayRows: playData.skippedRows,
    years: playData.years,
  };
}

export function withPlayGameIds(data: WorkspaceData): WorkspaceData {
  const byName = new Map(data.games.map((game) => [normalizeName(game.name), game.id]));
  return {
    ...data,
    plays: data.plays.map((play) => ({
      ...play,
      gameId: play.gameId ?? byName.get(normalizeName(play.gameName)),
    })),
  };
}

function gameId(name: string): string {
  return makeId("game", normalizeName(name));
}

export function prepareWorkbookImport(
  workbookImport: WorkbookImport,
  current: WorkspaceData,
): WorkspaceData {
  const existingByName = new Map(current.games.map((game) => [normalizeName(game.name), game]));
  const knownIds = new Set(current.games.map((game) => game.id));
  const importGames = workbookImport.data.games.filter(
    (game) => !existingByName.has(normalizeName(game.name)),
  );
  const gamesByName = new Map([
    ...current.games.map((game) => [normalizeName(game.name), game] as const),
    ...importGames.map((game) => [normalizeName(game.name), game] as const),
  ]);
  const missingGames = workbookImport.missingCatalogGames
    .filter((name) => !gamesByName.has(normalizeName(name)))
    .map((name): Game => ({
      id: gameId(name),
      name,
      owned: false,
    }))
    .filter((game) => !knownIds.has(game.id));
  for (const game of missingGames) gamesByName.set(normalizeName(game.name), game);

  const importedPlays = workbookImport.data.plays.map((play) => ({
    ...play,
    gameId: gamesByName.get(normalizeName(play.gameName))?.id,
  }));
  return {
    games: [...importGames, ...missingGames],
    plays: importedPlays,
    rankings: workbookImport.data.rankings,
    predictions: workbookImport.data.predictions,
  };
}

export function mergeImportedWorkspace(current: WorkspaceData, imported: WorkspaceData): WorkspaceData {
  function mergeById<T extends { id: string }>(original: T[], incoming: T[]): T[] {
    const records = new Map(original.map((record) => [record.id, record]));
    for (const record of incoming) records.set(record.id, { ...records.get(record.id), ...record });
    return [...records.values()];
  }
  return {
    games: mergeById(current.games, imported.games),
    plays: mergeById(current.plays, imported.plays),
    rankings: mergeById(current.rankings, imported.rankings),
    predictions: mergeById(current.predictions, imported.predictions),
  };
}
