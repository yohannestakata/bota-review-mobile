import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";
import { BranchCardSkeleton } from "@/features/home";

// Mirrors CollectionCircles: a size-20 circle with a label below.
function CircleSkeleton() {
  return (
    <View className="w-20 items-center gap-2">
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-3.5 w-14 rounded-full" />
    </View>
  );
}

// Boot placeholder — mirrors the home screen's initial view: header (avatar +
// location, two-line greeting, search bar), collection circles, then a rail.
export function AppLoadingSkeleton() {
  return (
    <View className="flex-1">
      <View className="mt-6 px-6">
        <View className="flex-row items-center justify-between">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </View>

        {/* "Hey {name}, what are you craving?" wraps to two lines. */}
        <View className="mt-4 gap-2">
          <Skeleton className="h-8 w-4/5 rounded-full" />
          <Skeleton className="h-8 w-1/2 rounded-full" />
        </View>

        <Skeleton className="mt-6 h-16 w-full rounded-full" />
      </View>

      <View className="mt-6 flex-row gap-4 overflow-hidden pl-6">
        <CircleSkeleton />
        <CircleSkeleton />
        <CircleSkeleton />
        <CircleSkeleton />
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
