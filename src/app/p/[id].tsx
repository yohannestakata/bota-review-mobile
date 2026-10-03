import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { useColors } from "@/lib/theme";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// <share host>/p/:ref (shared links, opened as universal/app links) lands
// here. The ref reads "wow-burger-bole-3f2a9c1b"; older links carry the full
// id. Either way, forward to the place page.
export default function SharedPlaceLink() {
  const { id: ref } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const colors = useColors();
  const isId = UUID.test(ref);
  const resolved = useQuery({
    queryKey: ["share", ref],
    queryFn: () =>
      apiFetch<{ branchId: string }>(
        `/share/${encodeURIComponent(ref)}`,
        getToken,
      ),
    enabled: !isId,
    retry: 1,
  });

  if (isId) return <Redirect href={`/branch/${ref}?source=share`} />;
  if (resolved.data) {
    return <Redirect href={`/branch/${resolved.data.branchId}?source=share`} />;
  }
  // A link to a place that's gone: land on home rather than a dead end.
  if (resolved.isError) return <Redirect href="/" />;
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.muted} />
    </View>
  );
}
