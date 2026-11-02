import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { removeUndefinedFields } from "./firestore-data";
import type { Game, HistoricalRanking, Play, WorkspaceData } from "../types";

export type DataKind = "games" | "plays" | "rankings";

export function subscribeToUserData(
  userId: string,
  kind: DataKind,
  onData: (records: Array<Game | Play | HistoricalRanking>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) throw new Error("Cloud storage is not configured.");
  return onSnapshot(
    collection(db, "users", userId, kind),
    (snapshot) => onData(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }) as Game | Play | HistoricalRanking)),
    onError,
  );
}

export async function saveUserRecord(
  userId: string,
  kind: DataKind,
  record: Game | Play | HistoricalRanking,
): Promise<void> {
  if (!db) throw new Error("Cloud storage is not configured.");
  const { id, ...values } = record;
  await setDoc(doc(db, "users", userId, kind, id), removeUndefinedFields(values));
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
      batch.set(doc(db, "users", userId, kind, id), removeUndefinedFields(values));
    }
    await batch.commit();
    onProgress({ completed: Math.min(offset + chunk.length, rows.length), total: rows.length });
  }
}

export async function fetchUserWorkspace(userId: string): Promise<WorkspaceData> {
  const firestore = db;
  if (!firestore) throw new Error("Cloud storage is not configured.");
  const kinds: DataKind[] = ["games", "plays", "rankings"];
  const results = await Promise.all(
    kinds.map((kind) => getDocs(collection(firestore, "users", userId, kind))),
  );
  return {
    games: results[0].docs.map((entry) => ({ ...entry.data(), id: entry.id }) as Game),
    plays: results[1].docs.map((entry) => ({ ...entry.data(), id: entry.id }) as Play),
    rankings: results[2].docs.map((entry) => ({ ...entry.data(), id: entry.id }) as HistoricalRanking),
  };
}
