import { LockIcon } from "@hugeicons/core-free-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Alert } from "@/components/ui/alert";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";

import type { Milestone } from "../api";
import { milestoneIcon, useSeenMilestones } from "../milestone-meta";
import { useMilestones } from "../queries";

// Profile's badges section. Each time Profile comes into focus it snapshots
// which earned badges are new, shows them with a "New" marker, then marks them
// seen so the marker appears once. Hidden until the data is ready.
export function ProfileBadges() {
  const milestones = useMilestones();
  const seen = useSeenMilestones();
  const [newIds, setNewIds] = useState<Set<string> | null>(null);

  // Profile is a tab and stays mounted, so re-snapshot on every focus to pick
  // up badges earned elsewhere (e.g. saving a 10th place).
  useFocusEffect(
    useCallback(() => {
      setNewIds(null);
    }, []),
  );

  if (newIds === null && milestones.isSuccess && seen.ready) {
    setNewIds(new Set(milestones.data.filter(seen.isNew).map((m) => m.id)));
  }

  useEffect(() => {
    if (newIds && newIds.size > 0) seen.markSeen([...newIds]);
    // Run once per snapshot, not when `seen` changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newIds]);

  if (!milestones.isSuccess || milestones.data.length === 0) return null;

  return (
    <MilestoneBadges
      milestones={milestones.data}
      newIds={newIds ?? new Set()}
    />
  );
}

// Profile's badge shelf. Earned badges show their icon; locked ones stay a
// mystery (lock + progress) so there's something left to discover. Tapping any
// badge explains it — what you did, or how to earn it.
export function MilestoneBadges({
  milestones,
  newIds,
}: {
  milestones: Milestone[];
  newIds: Set<string>;
}) {
  const earnedCount = milestones.filter((m) => m.earned).length;

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <ThemedText size="lg" weight="semibold">
          Badges
        </ThemedText>
        <ThemedText size="sm" tone="muted">
          {earnedCount} of {milestones.length} found
        </ThemedText>
      </View>
      <View className="flex-row flex-wrap gap-3">
        {milestones.map((milestone) => (
          <Badge
            isNew={newIds.has(milestone.id)}
            key={milestone.id}
            milestone={milestone}
          />
        ))}
      </View>
    </View>
  );
}

function Badge({ milestone, isNew }: { milestone: Milestone; isNew: boolean }) {
  const { earned, progress } = milestone;

  function explain() {
    haptics.select();
    Alert.alert(
      earned ? milestone.title : "Locked badge",
      earned
        ? milestone.description
        : `${milestone.hint} (${progress.current}/${progress.target})`,
    );
  }

  return (
    <Pressable
      accessibilityLabel={
        earned
          ? `${milestone.title} badge, earned`
          : `Locked badge, ${progress.current} of ${progress.target}`
      }
      accessibilityRole="button"
      className="items-center gap-1.5 rounded-2xl border border-placeholder bg-surface px-2 py-3"
      onPress={explain}
      // Three per row: 3 × 30% plus two 12px gaps fits every phone width, and
      // a fixed width keeps tiles equal no matter the label length.
      style={{ width: "30%" }}
    >
      <View
        className={`size-12 items-center justify-center rounded-full ${
          earned ? "bg-accent-soft" : "bg-surface-muted"
        }`}
      >
        <AppIcon
          color={earned ? colors.accent : colors.subtle}
          icon={earned ? milestoneIcon(milestone.id) : LockIcon}
          size={22}
        />
      </View>
      <ThemedText
        className="text-center"
        numberOfLines={1}
        size="xs"
        tone={earned ? "default" : "muted"}
        weight="semibold"
      >
        {earned ? milestone.title : `${progress.current}/${progress.target}`}
      </ThemedText>
      {isNew ? (
        <View className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5">
          <ThemedText size="xs" tone="inverse" weight="semibold">
            New
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}
