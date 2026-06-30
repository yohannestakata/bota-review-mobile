import { ScrollView, useWindowDimensions, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";

import type { HomeBranchSection } from "../api";
import { BranchCard } from "./branch-card";

const RAIL_SIDE_PADDING = 24;
const RAIL_GAP = 16;

type HomeSectionProps = {
  section: HomeBranchSection;
  savedIds: Set<string>;
  onToggleSave: (branch: BranchCardData) => void;
  onPressBranch?: (branch: BranchCardData) => void;
};

export function HomeSection({
  section,
  savedIds,
  onToggleSave,
  onPressBranch,
}: HomeSectionProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor(
    (width - RAIL_SIDE_PADDING * 2 - RAIL_GAP) / 2,
  );

  return (
    <View className="mt-10">
      <ThemedText className="px-6" size="2xl" weight="bold">
        {section.title}
      </ThemedText>
      <ScrollView
        contentContainerClassName="gap-4 px-6 pt-4"
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {section.items.map((branch) => (
          <View key={branch.id} style={{ width: cardWidth }}>
            <BranchCard
              branch={branch}
              isSaved={savedIds.has(branch.id)}
              layout="portrait"
              onPress={onPressBranch}
              onToggleSave={onToggleSave}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
