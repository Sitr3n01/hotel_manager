"use client";
import { useEffect, useState } from "react";

export type ConnectivityState = "online" | "offline" | "checking";

const HEALTH_URL = "/api/health";
const CHECK_INTERVAL_MS = 30_000;
const CHECK_TIMEOUT_MS = 5_000;

// Hit /api/health to verify true connectivity. navigator.onLine reports "true"
// even when the device is on a Wi-Fi without upstream — common in rural areas.
export async function pingServer(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    const res = await fetch(HEALTH_URL, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export function useConnectivity(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (!cancelled) setState("offline");
        return;
      }
      const ok = await pingServer();
      if (!cancelled) setState(ok ? "online" : "offline");
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    const handleOnline = () => check();
    const handleOffline = () => setState("offline");
    const handleVisibility = () => {
      if (!document.hidden) check();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return state;
}
