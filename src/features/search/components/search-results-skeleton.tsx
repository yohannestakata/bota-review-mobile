import { View } from "react-native";

import { BranchCardSkeleton } from "@/features/home";

// Search results are BranchCards, so reuse the same card skeleton.
export function SearchResultsSkeleton() {
  return (
    <View className="gap-5">
      <BranchCardSkeleton />
      <BranchCardSkeleton />
      <BranchCardSkeleton />
    </View>
  );
}
