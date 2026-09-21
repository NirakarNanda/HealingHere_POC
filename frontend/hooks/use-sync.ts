"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/database";
import { syncNow, isSyncing, triggerSync } from "@/lib/sync/sync-engine";
import { useOnlineStatus } from "./use-online-status";

/**
 * Sync orchestration: manual "Sync Now", auto-sync on mount when online,
 * and auto-sync on offline → online transitions.
 */
export function useSync() {
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  const pendingCount = useLiveQuery(
    () => db.patients.where("syncStatus").anyOf("PENDING", "FAILED").count(),
    []
  );

  const runSync = useCallback(async () => {
    if (!navigator.onLine) {
      toast.info("You're offline — records are safe on this device and will sync when internet returns.");
      return;
    }
    if (isSyncing()) return;
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  }, []);

  // Auto-sync when the browser starts online.
  useEffect(() => {
    if (online) triggerSync();
  }, [online]);

  return {
    online,
    syncing: syncing || isSyncing(),
    pendingCount: pendingCount ?? 0,
    syncNow: runSync,
  };
}
