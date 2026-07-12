import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-expo";

import type { TasteOption } from "./api";
import {
  homeKeys,
  useReplaceTastePreferences,
  useTastePreferencesQuery,
} from "./queries";

export function useTastePreferences() {
  const { userId } = useAuth();
  const query = useTastePreferencesQuery();
  const replace = useReplaceTastePreferences();
  const queryClient = useQueryClient();
  const tasteOptionIds = (query.data ?? []).map((option) => option.id);

  function toggle(tasteOptionId: string) {
    const previous = query.data ?? [];
    const nextIds = tasteOptionIds.includes(tasteOptionId)
      ? tasteOptionIds.filter((id) => id !== tasteOptionId)
      : [...tasteOptionIds, tasteOptionId];
    const next = tasteOptionIds.includes(tasteOptionId)
      ? previous.filter((option) => option.id !== tasteOptionId)
      : [...previous, { id: tasteOptionId } as TasteOption];
    queryClient.setQueryData(homeKeys.tastes(userId), next);
    replace.mutate(nextIds, {
      onError: () =>
        queryClient.setQueryData(homeKeys.tastes(userId), previous),
    });
  }

  return {
    tasteOptionIds,
    toggle,
    ready: query.isSuccess,
    saving: replace.isPending,
  };
}
