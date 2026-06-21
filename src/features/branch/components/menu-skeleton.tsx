import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

// Mirrors MenuItemRow: 56x56 image on the left, name + description, price right.
function MenuItemSkeleton() {
  return (
    <View className="flex-row items-start gap-3 py-3">
      <Skeleton className="size-14 rounded-xl" />
      <View className="flex-1 gap-1.5">
        <Skeleton className="h-5 w-2/3 rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
      </View>
      <Skeleton className="h-5 w-16 rounded-full" />
    </View>
  );
}

export function MenuSkeleton() {
  return (
    <View className="gap-1 px-6 pt-2">
      <Skeleton className="mb-1 h-3.5 w-24 rounded-full" />
      <MenuItemSkeleton />
      <MenuItemSkeleton />
      <MenuItemSkeleton />
      <Skeleton className="mb-1 mt-5 h-3.5 w-20 rounded-full" />
      <MenuItemSkeleton />
    </View>
  );
}
