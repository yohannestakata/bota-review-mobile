import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

const KEY = "taste_cuisines_v1";

// Locally-persisted taste preferences (cuisine slugs). Used to gently boost
// matching spots up the home feed — no backend, no server-side per-user cache.
export function useTastePreferences() {
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(KEY).then((raw) => {
      if (!active) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setCuisines(parsed.filter((v): v is string => typeof v === "string"));
          }
        } catch {
          // ignore a corrupt value
        }
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    setCuisines((current) => {
      const next = current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug];
      void SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { cuisines, toggle, ready };
}
