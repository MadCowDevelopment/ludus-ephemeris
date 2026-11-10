import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { removeUndefinedFields } from "./firestore-data";
import type { Game, HistoricalRanking, Play, WorkspaceData } from "../types";
import type { SyncCursor } from "./workspace-cache";

export type DataKind = "games" | "plays" | "rankings";

export async function saveUserRecord(
  userId: string,
  kind: DataKind,
  record: Game | Play | HistoricalRanking,
): Promise<void> {
  if (!db) throw new Error("Cloud storage is not configured.");
  const { id, ...values } = record;
  await setDoc(doc(db, "users", userId, kind, id), removeUndefinedFields({
    ...values,
    updatedAt: serverTimestamp(),
  }));
}

export interface ImportProgress {
  completed: number;
  total: number;
}

export async function importUserWorkspace(
  userId: string,
  data: WorkspaceData,
  onProgress: (progress: ImportProgress) => void,
): Promise<void> {
  if (!db) throw new Error("Cloud storage is not configured.");
  const rows: Array<{ kind: DataKind; record: Game | Play | HistoricalRanking }> = [
    ...data.games.map((record) => ({ kind: "games" as const, record })),
    ...data.plays.map((record) => ({ kind: "plays" as const, record })),
    ...data.rankings.map((record) => ({ kind: "rankings" as const, record })),
  ];
  const chunkSize = 400;

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const batch = writeBatch(db);
    const chunk = rows.slice(offset, offset + chunkSize);
    for (const { kind, record } of chunk) {
      const { id, ...values } = record;
      batch.set(doc(db, "users", userId, kind, id), removeUndefinedFields({
        ...values,
        updatedAt: serverTimestamp(),
      }));
    }
    await batch.commit();
    onProgress({ completed: Math.min(offset + chunk.length, rows.length), total: rows.length });
  }
}

export interface WorkspaceSyncResult {
  workspace: WorkspaceData;
  cursor: SyncCursor | null;
}

export async function syncUserWorkspace(
  userId: string,
  cursor: SyncCursor | null | undefined,
): Promise<WorkspaceSyncResult> {
  const firestore = db;
  if (!firestore) throw new Error("Cloud storage is not configured.");
  const kinds: DataKind[] = ["games", "plays", "rankings"];
  const results = await Promise.all(
    kinds.map((kind) => {
      const records = collection(firestore, "users", userId, kind);
      if (cursor === undefined) return getDocs(records);
      const lastSynced = cursor
        ? new Timestamp(cursor.seconds, cursor.nanoseconds)
        : new Timestamp(0, 0);
      return getDocs(query(records, where("updatedAt", ">", lastSynced)));
    }),
  );
  let latestCursor = cursor ?? null;
  const updatedRecords = results.map((result) => result.docs.map((entry) => {
    const updatedAt = entry.get("updatedAt");
    if (updatedAt instanceof Timestamp && (
      !latestCursor ||
      updatedAt.seconds > latestCursor.seconds ||
      (updatedAt.seconds === latestCursor.seconds && updatedAt.nanoseconds > latestCursor.nanoseconds)
    )) {
      latestCursor = { seconds: updatedAt.seconds, nanoseconds: updatedAt.nanoseconds };
    }
    const record = Object.fromEntries(
      Object.entries(entry.data()).filter(([key]) => key !== "updatedAt"),
    );
    return { ...record, id: entry.id };
  }));
  return {
    workspace: {
      games: updatedRecords[0] as Game[],
      plays: updatedRecords[1] as Play[],
      rankings: updatedRecords[2] as HistoricalRanking[],
    },
    cursor: latestCursor,
  };
}
