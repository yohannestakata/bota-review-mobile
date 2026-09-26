import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Alert } from "@/components/ui/alert";
import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";

import type { Milestone } from "../api";
import { useSeenMilestones } from "../milestone-meta";
import { MilestoneMedallion } from "./milestone-medallion";
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

// Profile's badge shelf: one horizontal row of medallions (earned first, then
// the locked ones closest to done), plus a "Next up" line naming the single
// most reachable badge. Tapping a medallion explains it or how to earn it.
export function MilestoneBadges({
  milestones,
  newIds,
}: {
  milestones: Milestone[];
  newIds: Set<string>;
}) {
  const earnedCount = milestones.filter((m) => m.earned).length;
  const ratio = (m: Milestone) => m.progress.current / m.progress.target;
  const ordered = [
    ...milestones.filter((m) => m.earned),
    ...milestones.filter((m) => !m.earned).sort((a, b) => ratio(b) - ratio(a)),
  ];
  const nextUp = ordered.find((m) => !m.earned);

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <ThemedText size="lg" weight="semibold">
          Badges
        </ThemedText>
        <ThemedText size="sm" tone="muted">
          {earnedCount} of {milestones.length}
        </ThemedText>
      </View>

      {/* Bleeds to the screen edges so the row reads as scrollable. */}
      <ScrollView
        contentContainerStyle={{ gap: 16, paddingHorizontal: 24 }}
        style={{ marginHorizontal: -24 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {ordered.map((milestone) => (
          <Badge
            isNew={newIds.has(milestone.id)}
            key={milestone.id}
            milestone={milestone}
          />
        ))}
      </ScrollView>

      {nextUp ? (
        <ThemedText size="sm" tone="muted">
          <ThemedText size="sm" weight="semibold">
            Next up: {nextUp.title}
          </ThemedText>
          {` · ${nextUp.hint.replace(/\.$/, "")}`}
        </ThemedText>
      ) : (
        <ThemedText size="sm" tone="muted">
          You found every badge. Legend.
        </ThemedText>
      )}
    </View>
  );
}

function Badge({ milestone, isNew }: { milestone: Milestone; isNew: boolean }) {
  const { earned, progress } = milestone;

  function explain() {
    haptics.select();
    Alert.alert(
      milestone.title,
      earned
        ? milestone.description
        : `${milestone.hint} ${progress.current} of ${progress.target} so far.`,
    );
  }

  return (
    <Pressable
      accessibilityLabel={
        earned
          ? `${milestone.title} badge, earned`
          : `${milestone.title} badge, ${progress.current} of ${progress.target}`
      }
      accessibilityRole="button"
      className="items-center gap-2"
      onPress={explain}
      style={{ width: 68 }}
    >
      <MilestoneMedallion milestone={milestone} showNewDot={isNew} />
      <ThemedText
        className="text-center"
        numberOfLines={2}
        size="xs"
        tone={earned ? "default" : "muted"}
        weight={earned ? "semibold" : "medium"}
      >
        {milestone.title}
      </ThemedText>
    </Pressable>
  );
}
