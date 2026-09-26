import { useAuth } from "@clerk/clerk-expo";
import { SpoonAndForkIcon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { ListErrorState } from "@/components/ui/list-state-placeholder";
import { EmptyState } from "@/components/ui/empty-state";
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
  const { isSignedIn } = useAuth();
  const menus = useBranchMenus(branchId);

  const data = menus.data ?? [];
  const itemCount = totalItemCount(data);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton onPress={() => router.back()} />
        <View className="flex-1">
          <ThemedText size="xl" weight="bold">
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
      ) : menus.isError ? (
        <ListErrorState
          errorText="Couldn't load the menu."
          onRetry={() => menus.refetch()}
        />
      ) : itemCount === 0 ? (
        <EmptyState
          action={{
            label: "Add what you know",
            onPress: () => {
              if (!isSignedIn) {
                router.push("/login");
                return;
              }
              router.push({
                pathname: "/suggest-edit/[branchId]",
                params: { branchId, ...(name ? { name } : {}) },
              });
            },
          }}
          body="Been here? Share a few dishes and prices to help the next person decide."
          icon={SpoonAndForkIcon}
          title="No menu yet"
        />
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
