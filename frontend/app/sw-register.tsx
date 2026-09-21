"use client";

import { useEffect } from "react";

/** Registers the offline-capable service worker once the app mounts. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline shell is best-effort; the app works fully without it.
      });
    }
  }, []);
  return null;
}
