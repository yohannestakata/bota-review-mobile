import * as SecureStore from "expo-secure-store";

// A random id for this install, made once. Not tied to the person or the
// hardware — just a steady seed (e.g. so a guest's daily "For you" rotation
// doesn't reshuffle on every request).
const KEY = "bota.device-id";
let cached: Promise<string> | null = null;

export function getDeviceId(): Promise<string> {
  cached ??= (async () => {
    try {
      const existing = await SecureStore.getItemAsync(KEY);
      if (existing) return existing;
      const id =
        Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      await SecureStore.setItemAsync(KEY, id);
      return id;
    } catch {
      return "device";
    }
  })();
  return cached;
}
