import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { OperationStatus, PendingOperation } from "./types";

const DB_NAME = "hotel-fazenda-offline";
const DB_VERSION = 1;
export const OPERATIONS_STORE = "operations";

interface OfflineDB extends DBSchema {
  operations: {
    key: string;
    value: PendingOperation;
    indexes: { "by-status": OperationStatus; "by-createdAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<OfflineDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponível no ambiente atual"));
  }
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(OPERATIONS_STORE, { keyPath: "localId" });
        store.createIndex("by-status", "status");
        store.createIndex("by-createdAt", "createdAt");
      },
    });
  }
  return dbPromise;
}

// For tests: reset the cached promise so a fresh in-memory IDB is opened.
export function resetDbForTests(): void {
  dbPromise = null;
}
