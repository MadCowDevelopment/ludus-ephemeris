import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mergeWorkspaceData,
  readUserWorkspaceCache,
  writeUserWorkspaceCache,
  type CachedWorkspace,
} from "./workspace-cache";

const storage = new Map<string, string>();

describe("user workspace cache", () => {
  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  it("round-trips cached workspace data and its sync cursor per user", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const cache: CachedWorkspace = {
      workspace: {
        games: [{ id: "catan", name: "Catan", owned: true }],
        plays: [],
        rankings: [],
      },
      cursor: { seconds: 123, nanoseconds: 456 },
    };

    writeUserWorkspaceCache("user-a", cache);

    expect(readUserWorkspaceCache("user-a")).toEqual(cache);
    expect(readUserWorkspaceCache("user-b")).toBeNull();
  });

  it("merges remote changes by record id without dropping cached records", () => {
    const merged = mergeWorkspaceData(
      {
        games: [
          { id: "catan", name: "Old Catan", owned: true },
          { id: "chess", name: "Chess", owned: true },
        ],
        plays: [{ id: "old-play", gameName: "Chess", date: "2025-01-01", durationHours: 1, playType: "solo" }],
        rankings: [],
      },
      {
        games: [
          { id: "catan", name: "New Catan", owned: false },
          { id: "terraforming-mars", name: "Terraforming Mars", owned: true },
        ],
        plays: [],
        rankings: [],
      },
    );

    expect(merged.games).toEqual([
      { id: "catan", name: "New Catan", owned: false },
      { id: "chess", name: "Chess", owned: true },
      { id: "terraforming-mars", name: "Terraforming Mars", owned: true },
    ]);
    expect(merged.plays).toHaveLength(1);
  });
});
