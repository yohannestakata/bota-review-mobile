import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";
import { BranchCardSkeleton } from "@/features/home";

// Boot placeholder — mirrors the home header (avatar + location, greeting,
// search bar) and the first rail.
export function AppLoadingSkeleton() {
  return (
    <View className="flex-1 pt-6">
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </View>
        <Skeleton className="mt-4 h-9 w-4/5 rounded-full" />
        <Skeleton className="mt-6 h-14 w-full rounded-2xl" />
      </View>

      <View className="mt-8 gap-3">
        <Skeleton className="ml-6 h-6 w-40 rounded-full" />
        <View className="flex-row gap-4 overflow-hidden pl-6">
          <View className="w-64">
            <BranchCardSkeleton />
          </View>
          <View className="w-64">
            <BranchCardSkeleton />
          </View>
        </View>
      </View>
    </View>
  );
}
