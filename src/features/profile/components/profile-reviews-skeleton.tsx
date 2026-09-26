import { View } from "react-native";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// Mirrors MyReviewRow line for line: place name + area beside the status
// badge, the 12px stars, two lines of review text, then Edit / Delete.
function ReviewSkeleton() {
  return (
    <View className="gap-2 rounded-2xl border border-placeholder bg-surface p-4">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <SkeletonText className="w-1/2" />
          <SkeletonText className="w-1/4" size="sm" />
        </View>
        {/* StatusBadge: py-1 around an xs line. */}
        <Skeleton className="w-20 rounded-full" style={{ height: 24 }} />
      </View>
      <Skeleton className="h-3 w-20 rounded-full" />
      <View>
        <SkeletonText className="w-full" />
        <SkeletonText className="w-3/4" />
      </View>
      <View className="flex-row gap-5 pt-1">
        <SkeletonText className="w-8" size="sm" />
        <SkeletonText className="w-12" size="sm" />
      </View>
    </View>
  );
}

export function ProfileReviewsSkeleton() {
  return (
    <View className="gap-4">
      <ReviewSkeleton />
      <ReviewSkeleton />
      <ReviewSkeleton />
    </View>
  );
}
