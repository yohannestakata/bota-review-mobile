import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { ThemedText } from "@/components/ui/themed-text";
import {
  MenuList,
  MenuSkeleton,
  totalItemCount,
  useBranchMenus,
} from "@/features/branch";

export default function MenuScreen() {
  const { branchId, name } = useLocalSearchParams<{
    branchId: string;
    name?: string;
  }>();
  const menus = useBranchMenus(branchId);

  const data = menus.data ?? [];
  const itemCount = totalItemCount(data);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton onPress={() => router.back()} />
        <View className="flex-1">
          <ThemedText size="lg" weight="semibold">
            Menu
          </ThemedText>
          {name ? (
            <ThemedText numberOfLines={1} size="sm" tone="muted">
              {name}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Menu rows live inside a white card floating on the warm background — the
          rows rely on neutral-100 dividers/placeholders that only read on a light
          surface, and this matches the card-on-background look of the home tabs. */}
      {menus.isPending ? (
        <ScrollView
          contentContainerClassName="px-6 pb-12 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-3xl bg-surface p-5">
            <MenuSkeleton />
          </View>
        </ScrollView>
      ) : itemCount === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <ThemedText className="text-center" tone="muted">
            No menu has been added for this spot yet.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pb-12 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-3xl bg-surface p-5">
            <MenuList menus={data} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
