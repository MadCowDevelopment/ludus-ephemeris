import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { prepareWorkbookImport, readWorkbook } from "./workbook";
import type { WorkspaceData } from "../types";

async function createWorkbookFile(): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const overview = workbook.addWorksheet("Overview");
  overview.addRow(["Name", "Solo", "Duration", "Purchased", "Purchase Prize", "Sell Prize", "Location", "Rating", "Want to play", "BGG ID", "Custom"]);
  overview.addRow(["Catan", "No", 1.5, new Date("2020-01-02T00:00:00Z"), 40, 0, "Shelf", 8, 7, 13, "kept"]);
  overview.addRow(["Catan", "Yes", 2, null, 25, 0, "Sold", 7, 4, 13, "duplicate"]);

  const year = workbook.addWorksheet("2025");
  year.addRow(["Date", "Name", "Duration", "Players", "Description"]);
  year.addRow([new Date("2025-01-02T00:00:00Z"), "Catan", 1.5, 1, "Solo night"]);
  year.addRow(["2025-01-03", "Catan", 2, 4, "Group game"]);
  year.addRow(["not-a-date", "Uncatalogued title", 1, 2, "Invalid date"]);
  year.addRow(["2025-01-04", "Bad duration", 0, 2, "Invalid duration"]);

  const pc100 = workbook.addWorksheet("PC100");
  pc100.addRow(["PC100 - 2025", "Score"]);
  pc100.addRow(["Catan", 12]);
  const fame = workbook.addWorksheet("Fame");
  fame.getCell("P1").value = "Top 25 plays 2025";
  fame.getCell("P2").value = "Catan";
  fame.getCell("Q2").value = 2;
  fame.getCell("R2").value = "Catan";
  fame.getCell("S2").value = 3.5;
  const predictions = workbook.addWorksheet("Predictions");
  predictions.getCell("A1").value = "2025 prediction";
  predictions.getCell("A2").value = "1 Wingspan 4";

  const buffer = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(buffer)], "fixture.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("workbook import", () => {
  it("imports catalog, plays, and historical rankings while ignoring predictions and reporting invalid rows", async () => {
    const imported = await readWorkbook(await createWorkbookFile());

    expect(imported.data.games).toHaveLength(2);
    expect(imported.duplicateGameNames).toEqual(["Catan"]);
    expect(imported.data.games[0].legacy).toMatchObject({ Custom: "kept" });
    expect(imported.data.plays).toHaveLength(2);
    expect(imported.data.plays.map((play) => play.playType)).toEqual(["solo", "multiplayer"]);
    expect(imported.missingCatalogGames).toEqual([]);
    expect(imported.skippedPlayRows).toEqual([
      { sheet: "2025", row: 4, gameName: "Uncatalogued title", reason: "Missing or unreadable date" },
      { sheet: "2025", row: 5, gameName: "Bad duration", reason: "Missing or invalid duration" },
    ]);
    expect(imported.data.rankings).toHaveLength(3);
    expect(imported.data).not.toHaveProperty("predictions");
  });

  it("links imported plays to their catalog titles", async () => {
    const imported = await readWorkbook(await createWorkbookFile());
    const emptyWorkspace: WorkspaceData = { games: [], plays: [], rankings: [] };
    const prepared = prepareWorkbookImport(imported, emptyWorkspace);

    expect(prepared.plays).toHaveLength(2);
    expect(prepared.plays.every((play) => play.gameId)).toBe(true);
    expect(prepared.games).toHaveLength(2);
  });
});
