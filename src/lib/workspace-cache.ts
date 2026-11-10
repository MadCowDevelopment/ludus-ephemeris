import type { Game, Play, WorkspaceData } from "../types";

const cacheVersion = 1;
const cacheKeyPrefix = "ludus-ephemeris-workspace:";

export interface SyncCursor {
  seconds: number;
  nanoseconds: number;
}

export interface CachedWorkspace {
  workspace: WorkspaceData;
  cursor: SyncCursor | null;
}

function isWorkspaceData(value: unknown): value is WorkspaceData {
  if (typeof value !== "object" || value === null) return false;
  const workspace = value as Partial<WorkspaceData>;
  return ["games", "plays", "rankings"].every((kind) =>
    Array.isArray(workspace[kind as keyof WorkspaceData]) &&
    (workspace[kind as keyof WorkspaceData] as Array<{ id?: unknown }>).every(
      (record) => typeof record?.id === "string",
    ),
  );
}

function isSyncCursor(value: unknown): value is SyncCursor | null {
  if (value === null) return true;
  if (typeof value !== "object" || value === null) return false;
  const cursor = value as Partial<SyncCursor>;
  return Number.isInteger(cursor.seconds) &&
    Number.isInteger(cursor.nanoseconds) &&
    (cursor.nanoseconds as number) >= 0 &&
    (cursor.nanoseconds as number) < 1_000_000_000;
}

export function readUserWorkspaceCache(userId: string): CachedWorkspace | null {
  const raw = localStorage.getItem(`${cacheKeyPrefix}${userId}`);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const cache = parsed as Partial<CachedWorkspace> & { version?: unknown };
    if (cache.version !== cacheVersion || !isWorkspaceData(cache.workspace) || !isSyncCursor(cache.cursor)) {
      return null;
    }
    return { workspace: cache.workspace, cursor: cache.cursor };
  } catch {
    return null;
  }
}

export function writeUserWorkspaceCache(userId: string, cache: CachedWorkspace): void {
  localStorage.setItem(`${cacheKeyPrefix}${userId}`, JSON.stringify({
    version: cacheVersion,
    ...cache,
  }));
}

function mergeRecords<T extends { id: string }>(current: T[], updates: T[]): T[] {
  const byId = new Map(updates.map((record) => [record.id, record]));
  const merged = current.map((record) => {
    const update = byId.get(record.id);
    if (update) byId.delete(record.id);
    return update ?? record;
  });
  return [...merged, ...byId.values()];
}

export function mergeWorkspaceData(current: WorkspaceData, updates: WorkspaceData): WorkspaceData {
  return {
    games: mergeRecords(current.games, updates.games),
    plays: mergeRecords(current.plays, updates.plays),
    rankings: mergeRecords(current.rankings, updates.rankings),
  };
}

export function upsertWorkspaceRecord(
  workspace: WorkspaceData,
  kind: "games" | "plays",
  record: Game | Play,
): WorkspaceData {
  if (kind === "games") {
    if (!("name" in record)) throw new Error("A game record is required.");
    return { ...workspace, games: mergeRecords(workspace.games, [record]) };
  }
  if (!("gameName" in record)) throw new Error("A play record is required.");
  if (!workspace.plays.some((play) => play.id === record.id)) {
    return { ...workspace, plays: [record, ...workspace.plays] };
  }
  return { ...workspace, plays: mergeRecords(workspace.plays, [record]) };
}

export function emptyWorkspaceData(): WorkspaceData {
  return { games: [], plays: [], rankings: [] };
}
