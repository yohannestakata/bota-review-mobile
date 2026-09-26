import { View } from "react-native";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// Mirrors BranchCard line for line: the cover (4:5 in rails, 4:3 in lists),
// then name (lg), area (sm) and rating · price (sm), inset like the real text.
export function BranchCardSkeleton({
  layout = "landscape",
}: {
  layout?: "portrait" | "landscape";
}) {
  return (
    <View>
      <Skeleton
        className={`w-full rounded-2xl ${
          layout === "portrait" ? "aspect-[4/5]" : "aspect-[4/3]"
        }`}
      />
      <View
        className="mt-3"
        style={{ paddingLeft: layout === "portrait" ? 4 : 3 }}
      >
        <SkeletonText className="w-2/3" size="lg" />
        <SkeletonText className="w-1/2" size="sm" />
        <View className="mt-0.5">
          <SkeletonText className="w-1/3" size="sm" />
        </View>
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
