import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

// Mirrors MyReviewRow: place + status badge, stars, two lines, Edit/Delete row.
function ReviewSkeleton() {
  return (
    <View className="gap-2 rounded-2xl border border-neutral-100 bg-white p-4">
      <View className="flex-row items-center gap-2">
        <Skeleton className="h-5 flex-1 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </View>
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-4 w-3/4 rounded-full" />
      <View className="flex-row gap-5 pt-1">
        <Skeleton className="h-4 w-8 rounded-full" />
        <Skeleton className="h-4 w-10 rounded-full" />
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
