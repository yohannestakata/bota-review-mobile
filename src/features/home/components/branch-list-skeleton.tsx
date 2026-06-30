import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

// Mirrors BranchCard: a cover, then the name, subtitle, and rating line.
export function BranchCardSkeleton() {
  return (
    <View>
      <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
      <View className="mt-3 gap-1.5">
        <Skeleton className="h-5 w-2/3 rounded-full" />
        <Skeleton className="h-4 w-1/2 rounded-full" />
        <Skeleton className="h-3.5 w-1/3 rounded-full" />
      </View>
    </View>
  );
}

export function BranchListSkeleton() {
  return (
    <View className="gap-5">
      <BranchCardSkeleton />
      <BranchCardSkeleton />
      <BranchCardSkeleton />
    </View>
  );
}
