import { View } from "react-native";

import { SkeletonText } from "@/components/ui/skeleton";
import { BranchCardSkeleton } from "@/features/home";

// Mirrors the loaded list: the "Results" / "Explore places" title (xl, then
// the header's mb-5), then BranchCards 20px apart. Below the suggestions the
// real title sits in the same header (gap-3, not mb-5), so pull it up to match.
export function SearchResultsSkeleton({
  belowSuggestions = false,
}: {
  belowSuggestions?: boolean;
}) {
  return (
    <View className={belowSuggestions ? "-mt-2" : ""}>
      <View className="mb-5">
        <SkeletonText className="w-32" size="xl" />
      </View>
      <View className="gap-5">
        <BranchCardSkeleton />
        <BranchCardSkeleton />
        <BranchCardSkeleton />
      </View>
    </View>
  );
}
