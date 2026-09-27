import * as SecureStore from "expo-secure-store";

import { debugLog } from "@/lib/debug";

// Taste picks made while signed out live on the device, so guests get a
// personal "For you" too. When they sign in, the picks move to their account
// (see useMigrateGuestTastes). Failures read as "no picks" — never a blocker.

const KEY = "bota.guest-tastes";

export async function readGuestTastes(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids)
      ? ids.filter((id): id is string => typeof id === "string")
      : [];
  } catch (error) {
    debugLog("guest-tastes", "read failed", { error: String(error) });
    return [];
  }
}

export function writeGuestTastes(ids: string[]) {
  const write =
    ids.length > 0
      ? SecureStore.setItemAsync(KEY, JSON.stringify(ids))
      : SecureStore.deleteItemAsync(KEY);
  write.catch((error: unknown) =>
    debugLog("guest-tastes", "write failed", { error: String(error) }),
  );
}
