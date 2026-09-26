import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { shadows } from "@/lib/theme";

import { HERO_HEIGHT } from "./branch-hero";

// Mirrors the branch page's first screen with its exact spacing, so the real
// page drops in without shifting: hero, the sheet's heading (eyebrow, 3xl
// name, rating row, address), the three action tiles, description, chips and
// the first section, plus the floating back button and the review bar — the
// back button works while loading.
export function BranchDetailSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <Skeleton className="w-full" style={{ height: HERO_HEIGHT }} />

      <View className="-mt-6 flex-1 rounded-t-3xl bg-background pt-6">
        <View className="gap-2 px-6">
          <SkeletonText className="w-28" size="sm" />
          <SkeletonText className="w-3/4" size="3xl" />
          <SkeletonText className="w-1/2" />
          <SkeletonText className="w-2/3" />
        </View>

        {/* ActionTile: py-3 around a 22px icon, gap-1.5, and an sm label. */}
        <View className="mt-5 flex-row gap-3 px-6">
          {[0, 1, 2].map((i) => (
            <Skeleton
              className="flex-1 rounded-2xl"
              key={i}
              style={{ height: 71 }}
            />
          ))}
        </View>

        <View className="mt-5 px-6">
          <SkeletonText className="w-full" />
          <SkeletonText className="w-full" />
          <SkeletonText className="w-1/2" />
        </View>

        {/* Chip: py-1.5 around an sm line. */}
        <View className="mt-5 flex-row gap-2 px-6">
          {["w-20", "w-24", "w-16"].map((w) => (
            <Skeleton
              className={`rounded-full ${w}`}
              key={w}
              style={{ height: 31 }}
            />
          ))}
        </View>

        <View className="mx-6 mt-7 h-px bg-border" />
        <View className="mt-6 gap-2 px-6">
          <SkeletonText className="w-24" size="xl" />
          <SkeletonText className="w-full" />
          <SkeletonText className="w-full" />
        </View>
      </View>

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        pointerEvents="box-none"
        style={{ top: insets.top + 8 }}
      >
        <IconButton
          accessibilityLabel="Go back"
          icon={ArrowLeft01Icon}
          iconSize={22}
          onPress={() => router.back()}
          size={44}
          style={shadows.navigation}
        />
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-placeholder bg-background px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Skeleton className="h-14 w-full rounded-full" />
      </View>
    </View>
  );
}
