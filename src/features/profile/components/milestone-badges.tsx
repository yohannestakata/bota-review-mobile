import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";
import { shadows, useColors } from "@/lib/theme";

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
// for themselves. Tapping one shows a small tooltip explaining it (or how to
// earn it) that fades on its own — informational, nothing to dismiss.
const BADGE_WIDTH = 68;
const BADGE_GAP = 16;
const EDGE = 24;
const TIP_MAX_WIDTH = 260;
const TIP_MS = 3500;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TIP_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -4 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
}).duration(160);

export function MilestoneBadges({
  milestones,
  newIds,
}: {
  milestones: Milestone[];
  newIds: Set<string>;
}) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const ratio = (m: Milestone) => m.progress.current / m.progress.target;
  const ordered = [
    ...milestones.filter((m) => m.earned),
    ...milestones.filter((m) => !m.earned).sort((a, b) => ratio(b) - ratio(a)),
  ];

  const [tip, setTip] = useState<{
    milestone: Milestone;
    center: number;
  } | null>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const scrollX = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tip) return;
    timer.current = setTimeout(() => setTip(null), TIP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [tip]);

  function toggleTip(milestone: Milestone, index: number) {
    if (tip?.milestone.id === milestone.id) {
      setTip(null);
      return;
    }
    haptics.select();
    // Badge center relative to this row (the ScrollView bleeds EDGE past it).
    const center =
      index * (BADGE_WIDTH + BADGE_GAP) + BADGE_WIDTH / 2 - scrollX.current;
    setTip({ milestone, center });
  }

  const tipWidth = Math.min(TIP_MAX_WIDTH, rowWidth);
  const tipLeft = tip
    ? Math.min(Math.max(tip.center - tipWidth / 2, 0), rowWidth - tipWidth)
    : 0;

  return (
    <View
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      style={{ zIndex: 1 }}
    >
      {/* Bleeds to the screen edges so the row reads as scrollable. */}
      <ScrollView
        contentContainerStyle={{ gap: BADGE_GAP, paddingHorizontal: EDGE }}
        horizontal
        onScroll={(e) => {
          scrollX.current = e.nativeEvent.contentOffset.x;
          if (tip) setTip(null);
        }}
        scrollEventThrottle={32}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -EDGE }}
      >
        {ordered.map((milestone, index) => (
          <Badge
            isNew={newIds.has(milestone.id)}
            key={milestone.id}
            milestone={milestone}
            onPress={() => toggleTip(milestone, index)}
          />
        ))}
      </ScrollView>

      {tip ? (
        <Animated.View
          entering={reduced ? FadeIn.duration(120) : TIP_ENTER}
          exiting={FadeOut.duration(120)}
          key={tip.milestone.id}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "100%",
            left: tipLeft,
            width: tipWidth,
            marginTop: 6,
          }}
        >
          {/* Caret pointing up at the badge. */}
          <View
            style={{
              marginLeft: Math.min(
                Math.max(tip.center - tipLeft - 6, 14),
                tipWidth - 26,
              ),
              width: 12,
              height: 12,
              backgroundColor: colors.pill,
              transform: [{ rotate: "45deg" }],
              marginBottom: -6,
              borderRadius: 2,
            }}
          />
          <View
            className="rounded-2xl px-4 py-3"
            style={[shadows.navigation, { backgroundColor: colors.pill }]}
          >
            <ThemedText size="sm" tone="inverse" weight="semibold">
              {tip.milestone.title}
            </ThemedText>
            <ThemedText className="opacity-80" size="sm" tone="inverse">
              {tip.milestone.earned
                ? tip.milestone.description
                : `${tip.milestone.hint} ${tip.milestone.progress.current} of ${tip.milestone.progress.target} so far.`}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Badge({
  milestone,
  isNew,
  onPress,
}: {
  milestone: Milestone;
  isNew: boolean;
  onPress: () => void;
}) {
  const { earned, progress } = milestone;

  return (
    <Pressable
      accessibilityHint={
        earned
          ? milestone.description
          : `${milestone.hint} ${progress.current} of ${progress.target} so far.`
      }
      accessibilityLabel={
        earned
          ? `${milestone.title} badge, earned`
          : `${milestone.title} badge, ${progress.current} of ${progress.target}`
      }
      accessibilityRole="button"
      className="items-center gap-2"
      onPress={onPress}
      style={{ width: BADGE_WIDTH }}
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
