import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";

import { timeoutSignal } from "@/lib/api";

// Feeds real connectivity into TanStack Query: while offline, queries pause
// (showing cached data right away) instead of hanging, and everything
// refetches the moment we're back.
//
// Android's "internet reachable" flag is unreliable: it can read false on a
// perfectly good connection, and often never fires again when the network
// recovers. So:
// - "not connected" (airplane mode, no Wi-Fi/data) counts as offline at once;
// - "connected but unreachable" is double-checked with a real request first;
// - while offline we keep re-checking (every few seconds, and whenever the app
//   comes to the foreground), so the offline banner clears promptly.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
// The health check lives at the site root, outside /v1.
const PING_URL = `${API_BASE_URL.replace(/\/v1\/?$/, "")}/health`;
const PING_TIMEOUT_MS = 4000;
const RECHECK_MS = 5000;

async function canReachServer() {
  if (!API_BASE_URL) return true;
  try {
    const res = await fetch(PING_URL, {
      method: "GET",
      signal: timeoutSignal(PING_TIMEOUT_MS),
    });
    // Any answer means we're online (a cold server still answers eventually).
    return res.status > 0;
  } catch {
    return false;
  }
}

async function checkNow(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return canReachServer();
    return true;
  } catch {
    return true;
  }
}

let started = false;

export function startConnectivityMonitoring() {
  if (started) return;
  started = true;

  onlineManager.setEventListener((setOnline) => {
    let recheck: ReturnType<typeof setInterval> | null = null;
    let checking = false;

    const apply = (online: boolean) => {
      setOnline(online);
      if (!online && !recheck) {
        recheck = setInterval(() => void refresh(), RECHECK_MS);
      } else if (online && recheck) {
        clearInterval(recheck);
        recheck = null;
      }
    };

    const refresh = async () => {
      if (checking) return;
      checking = true;
      try {
        apply(await checkNow());
      } finally {
        checking = false;
      }
    };

    const netSub = Network.addNetworkStateListener((state) => {
      if (state.isConnected === false) apply(false);
      else void refresh();
    });
    const appSub = AppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });
    void refresh();

    return () => {
      netSub.remove();
      appSub.remove();
      if (recheck) clearInterval(recheck);
    };
  });
}
