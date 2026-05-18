"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useConnectivity, type ConnectivityState } from "./connectivity";
import { countByStatus } from "./queue";
import { runSync } from "./sync-engine";
import type { CountsByStatus } from "./types";

type SyncCtx = {
  connectivity: ConnectivityState;
  counts: CountsByStatus;
  refreshCounts: () => Promise<void>;
  triggerSync: () => Promise<void>;
};

const EMPTY_COUNTS: CountsByStatus = {
  PENDING: 0,
  SYNCING: 0,
  SYNCED: 0,
  FAILED: 0,
  CONFLICT: 0,
};

const SyncContext = createContext<SyncCtx | null>(null);

export function useSync(): SyncCtx {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync exige SyncProvider acima na árvore");
  return ctx;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const connectivity = useConnectivity();
  const [counts, setCounts] = useState<CountsByStatus>(EMPTY_COUNTS);

  const refreshCounts = useCallback(async () => {
    try {
      const next = await countByStatus();
      setCounts(next);
    } catch {
      // IndexedDB indisponível (SSR ou navegador antigo) — silenciar.
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (connectivity !== "online") return;
    try {
      await runSync();
    } catch {
      // sync-engine já persiste falhas; nada a propagar.
    }
    await refreshCounts();
  }, [connectivity, refreshCounts]);

  useEffect(() => {
    // IndexedDB has no native subscription API. We must read it on mount and
    // store the snapshot in state — this is a legit "synchronize with external
    // system" case that the new React 19 lint rule cannot model.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    // triggerSync mutates state indirectly via refreshCounts; same justification
    // as above (sync engine drains the queue and updates the snapshot).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (connectivity === "online") triggerSync();
  }, [connectivity, triggerSync]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => triggerSync();
    const onEnqueued = () => {
      refreshCounts();
      triggerSync();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("sync:enqueued", onEnqueued);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("sync:enqueued", onEnqueued);
    };
  }, [triggerSync, refreshCounts]);

  return (
    <SyncContext.Provider value={{ connectivity, counts, refreshCounts, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}
