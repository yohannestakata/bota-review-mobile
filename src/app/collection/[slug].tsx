import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  BranchCard,
  useCollection,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { colors } from "@/lib/theme";

const EMPTY_SAVED = new Set<string>();

export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const collection = useCollection(slug);
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      toggleSave.mutate({
        branchId: branch.id,
        isSaved: (savedIds ?? EMPTY_SAVED).has(branch.id),
      });
    },
    [savedIds, toggleSave],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <AppIcon color={colors.foreground} icon={ArrowLeft01Icon} size={24} />
        </Pressable>
        <ThemedText numberOfLines={1} size="lg" weight="semibold">
          {collection.data?.name ?? "Collection"}
        </ThemedText>
      </View>

      {collection.isPending ? (
        <View className="mt-24 items-center">
          <ActivityIndicator color={colors.foreground} />
        </View>
      ) : collection.isError || !collection.data ? (
        <View className="mt-24 items-center gap-3 px-6">
          <ThemedText tone="muted">Couldn&apos;t load this collection.</ThemedText>
          <Pressable onPress={() => collection.refetch()}>
            <ThemedText tone="brand" weight="semibold">
              Try again
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerClassName="gap-5 px-6 pb-10 pt-2"
          data={collection.data.branches}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            collection.data.description ? (
              <ThemedText className="leading-6" tone="muted">
                {collection.data.description}
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              isSaved={(savedIds ?? EMPTY_SAVED).has(item.id)}
              onPress={(branch) => router.push(`/branch/${branch.id}`)}
              onToggleSave={onToggleSave}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
