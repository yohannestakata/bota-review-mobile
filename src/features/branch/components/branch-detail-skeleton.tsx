import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

export function BranchDetailSkeleton() {
  return (
    <View className="flex-1 bg-background">
      {/* Hero (HERO_HEIGHT = 360) */}
      <Skeleton className="h-[360px] w-full" />

      <View className="-mt-6 flex-1 rounded-t-3xl bg-background px-6 pt-8">
        {/* Heading: eyebrow, title, rating row, address */}
        <View className="gap-2">
          <Skeleton className="h-3.5 w-28 rounded-full" />
          <Skeleton className="h-9 w-3/4 rounded-full" />
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-4 w-2/3 rounded-full" />
        </View>

        {/* Quick actions: three equal buttons */}
        <View className="mt-5 flex-row gap-3">
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
        </View>

        {/* Description */}
        <View className="mt-5 gap-2">
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-5/6 rounded-full" />
        </View>

        {/* Cuisine + tag chips */}
        <View className="mt-5 flex-row gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </View>

        {/* A section (title + a couple rows) */}
        <Skeleton className="mt-8 h-6 w-24 rounded-full" />
        <View className="mt-3 gap-3">
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
        </View>
      </View>
    </View>
  );
}
