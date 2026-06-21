import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  MenuList,
  MenuSkeleton,
  totalItemCount,
  useBranchMenus,
} from "@/features/branch";
import { colors } from "@/lib/theme";

export default function MenuScreen() {
  const { branchId, name } = useLocalSearchParams<{
    branchId: string;
    name?: string;
  }>();
  const menus = useBranchMenus(branchId);

  const data = menus.data ?? [];
  const itemCount = totalItemCount(data);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          className="size-10 items-center justify-center rounded-full bg-surface"
          hitSlop={8}
          onPress={() => router.back()}
        >
          <AppIcon color={colors.foreground} icon={ArrowLeft01Icon} size={20} />
        </Pressable>
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

      {menus.isPending ? (
        <MenuSkeleton />
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
          <MenuList menus={data} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
