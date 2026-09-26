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
  // A failed fetch (e.g. offline) would otherwise leave the row empty until
  // the app restarts — retry it whenever Profile comes back into view.
  const { isError, refetch } = milestones;
  useFocusEffect(
    useCallback(() => {
      setNewIds(null);
      if (isError) void refetch();
    }, [isError, refetch]),
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

// Profile's badge shelf: just the row of medallions (earned first, then the
// locked ones closest to done). No heading or counter — the medallions speak
// for themselves; tapping one explains it or how to earn it.
export function MilestoneBadges({
  milestones,
  newIds,
}: {
  milestones: Milestone[];
  newIds: Set<string>;
}) {
  const ratio = (m: Milestone) => m.progress.current / m.progress.target;
  const ordered = [
    ...milestones.filter((m) => m.earned),
    ...milestones.filter((m) => !m.earned).sort((a, b) => ratio(b) - ratio(a)),
  ];

  return (
    <View>
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
