import { View } from "react-native";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { CircleRowSkeleton, RailSkeleton } from "@/features/home";

// Boot placeholder — mirrors the home screen's initial view with the same
// spacing: avatar + location pill, a two-line 3xl greeting, the search bar,
// collection circles, then a rail.
export function AppLoadingSkeleton() {
  return (
    <View className="flex-1">
      <View className="mt-5 px-6">
        <View className="flex-row items-center justify-between">
          <Skeleton className="size-10 rounded-full" />
          {/* LocationPill: py-2 around a md line, plus the 1px border. */}
          <Skeleton className="w-36 rounded-full" style={{ height: 42 }} />
        </View>
        <View className="mt-5">
          <SkeletonText className="w-4/5" size="3xl" />
          <SkeletonText className="w-1/3" size="3xl" />
        </View>
      </View>

      <View className="mt-6 px-6">
        <Skeleton className="h-16 w-full rounded-full" />
      </View>

      <CircleRowSkeleton />
      <RailSkeleton />
    </View>
  );
}
