import { useWindowDimensions, View } from "react-native";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { BranchCardSkeleton } from "./branch-list-skeleton";

const RAIL_SIDE_PADDING = 24;
const RAIL_GAP = 16;

// Mirrors CollectionCircles: a size-20 circle with a one-line sm label below.
export function CircleSkeleton() {
  return (
    <View className="w-20 items-center gap-2">
      <Skeleton className="size-20 rounded-full" />
      <SkeletonText className="w-14" size="sm" />
    </View>
  );
}

export function CircleRowSkeleton() {
  return (
    <View className="mt-6 flex-row gap-4 overflow-hidden pl-6">
      <CircleSkeleton />
      <CircleSkeleton />
      <CircleSkeleton />
      <CircleSkeleton />
    </View>
  );
}

// Mirrors HomeSection: title (xl) and description, then a rail of portrait
// BranchCards the same width as the real ones.
export function RailSkeleton() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - RAIL_SIDE_PADDING * 2 - RAIL_GAP) / 2);

  return (
    <View className="mt-10">
      <View className="gap-1 px-6">
        <SkeletonText className="w-40" size="xl" />
        <SkeletonText className="w-64" />
      </View>
      <View className="flex-row gap-4 overflow-hidden px-6 pt-3">
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: cardWidth }}>
            <BranchCardSkeleton layout="portrait" />
          </View>
        ))}
      </View>
    </View>
  );
}

export function HomeFeedSkeleton() {
  return (
    <View>
      <CircleRowSkeleton />
      <RailSkeleton />
      <RailSkeleton />

      {/* "Highly rated" — a titled vertical list of full-width cards. */}
      <View className="mt-10 gap-4 px-6">
        <View className="gap-1">
          <SkeletonText className="w-32" size="xl" />
          <SkeletonText className="w-64" />
        </View>
        <BranchCardSkeleton />
        <BranchCardSkeleton />
      </View>
    </View>
  );
}
