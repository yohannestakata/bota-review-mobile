import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";
import { BranchCardSkeleton } from "./branch-list-skeleton";

// Mirrors CollectionCircles: a row of size-20 circles with a label below.
function CircleSkeleton() {
  return (
    <View className="w-20 items-center gap-2">
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-3.5 w-14 rounded-full" />
    </View>
  );
}

// Mirrors HomeSection: a title, then a horizontal rail of w-64 BranchCards.
function RailSkeleton() {
  return (
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
  );
}

export function HomeFeedSkeleton() {
  return (
    <View>
      <View className="mt-6 flex-row gap-4 overflow-hidden pl-6">
        <CircleSkeleton />
        <CircleSkeleton />
        <CircleSkeleton />
        <CircleSkeleton />
      </View>

      <RailSkeleton />
      <RailSkeleton />

      {/* "Highly rated" — a titled vertical list of full-width cards. */}
      <View className="mt-8 gap-4 px-6">
        <Skeleton className="h-6 w-32 rounded-full" />
        <BranchCardSkeleton />
        <BranchCardSkeleton />
      </View>
    </View>
  );
}
