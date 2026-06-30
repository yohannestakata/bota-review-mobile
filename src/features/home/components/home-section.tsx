import { ScrollView, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";

import type { HomeBranchSection } from "../api";
import { BranchCard } from "./branch-card";

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
  return (
    <View className="mt-10">
      <ThemedText className="px-6" size="2xl" weight="bold">
        {section.title}
      </ThemedText>
      <ScrollView
        contentContainerClassName="gap-6 px-6 pt-4"
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {section.items.map((branch) => (
          <View className="w-60" key={branch.id}>
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
