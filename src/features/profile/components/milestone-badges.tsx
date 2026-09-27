import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";
import { shadows, useColors } from "@/lib/theme";

import type { Milestone } from "../api";
import { useSeenMilestones } from "../milestone-meta";
import { MilestoneMedallion } from "./milestone-medallion";
import { useMilestones } from "../queries";

// Profile's badges section. Each time Profile comes into focus it snapshots
// which earned badges are new, shows them with a "New" marker, then marks them
// seen so the marker appears once. A skeleton row holds the space while it
// loads; hidden if it fails or there's nothing to show.
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

  if (milestones.isPending) return <BadgesSkeleton />;
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
// earn it). It's informational: it fades on its own, and any tap elsewhere
// closes it — it sits in a transparent overlay so outside taps land on it.
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

type Rect = { x: number; y: number; width: number; height: number };

export function MilestoneBadges({
  milestones,
  newIds,
}: {
  milestones: Milestone[];
  newIds: Set<string>;
}) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const ratio = (m: Milestone) => m.progress.current / m.progress.target;
  const ordered = [
    ...milestones.filter((m) => m.earned),
    ...milestones.filter((m) => !m.earned).sort((a, b) => ratio(b) - ratio(a)),
  ];

  // The tapped badge and where it sits on screen (window coordinates).
  const [tip, setTip] = useState<{ milestone: Milestone; rect: Rect } | null>(
    null,
  );

  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(null), TIP_MS);
    return () => clearTimeout(timer);
  }, [tip]);

  // Every badge's on-screen spot while a tooltip is open, so a tap on
  // another badge (which lands on the overlay) switches to its tooltip.
  const badgeRefs = useRef(new Map<string, View>());
  const badgeRects = useRef(new Map<string, Rect>());

  function showTip(milestone: Milestone, rect: Rect) {
    haptics.select();
    setTip({ milestone, rect });
    badgeRects.current.clear();
    badgeRefs.current.forEach((view, id) =>
      view.measureInWindow((x, y, width, height) =>
        badgeRects.current.set(id, { x, y, width, height }),
      ),
    );
  }

  function onOverlayPress(x: number, y: number) {
    for (const [id, r] of badgeRects.current) {
      const hit =
        x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
      if (!hit) continue;
      const milestone = ordered.find((m) => m.id === id);
      // Tapping the open badge again closes it; another badge switches.
      if (milestone && milestone.id !== tip?.milestone.id) {
        showTip(milestone, r);
        return;
      }
      break;
    }
    setTip(null);
  }

  const tipWidth = Math.min(TIP_MAX_WIDTH, screenWidth - EDGE * 2);
  const center = tip ? tip.rect.x + tip.rect.width / 2 : 0;
  const tipLeft = Math.min(
    Math.max(center - tipWidth / 2, EDGE),
    screenWidth - EDGE - tipWidth,
  );

  return (
    <View>
      {/* Bleeds to the screen edges so the row reads as scrollable. */}
      <ScrollView
        contentContainerStyle={{ gap: BADGE_GAP, paddingHorizontal: EDGE }}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -EDGE }}
      >
        {ordered.map((milestone) => (
          <Badge
            isNew={newIds.has(milestone.id)}
            key={milestone.id}
            milestone={milestone}
            onPress={(rect) => showTip(milestone, rect)}
            registerRef={(view) => {
              if (view) badgeRefs.current.set(milestone.id, view);
              else badgeRefs.current.delete(milestone.id);
            }}
          />
        ))}
      </ScrollView>

      <Modal
        animationType="none"
        navigationBarTranslucent
        onRequestClose={() => setTip(null)}
        statusBarTranslucent
        transparent
        visible={tip !== null}
      >
        {/* A tap outside the bubble closes it, or switches to the badge
            that was tapped. */}
        <Pressable
          accessibilityLabel="Close"
          onPress={(e) =>
            onOverlayPress(e.nativeEvent.pageX, e.nativeEvent.pageY)
          }
          style={StyleSheet.absoluteFill}
        />
        {tip ? (
          <Animated.View
            entering={reduced ? FadeIn.duration(120) : TIP_ENTER}
            key={tip.milestone.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: tip.rect.y + tip.rect.height + 6,
              left: tipLeft,
              width: tipWidth,
            }}
          >
            {/* Caret pointing up at the badge. */}
            <View
              style={{
                marginLeft: Math.min(
                  Math.max(center - tipLeft - 6, 14),
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
      </Modal>
    </View>
  );
}

function Badge({
  milestone,
  isNew,
  onPress,
  registerRef,
}: {
  milestone: Milestone;
  isNew: boolean;
  onPress: (rect: Rect) => void;
  registerRef: (view: View | null) => void;
}) {
  const { earned, progress } = milestone;
  const ref = useRef<View | null>(null);

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
      onPress={() =>
        ref.current?.measureInWindow((x, y, width, height) =>
          onPress({ x, y, width, height }),
        )
      }
      ref={(view) => {
        ref.current = view;
        registerRef(view);
      }}
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

// Mirrors the badge row (60pt medallion + one-line xs label per 68pt column)
// so the menu below doesn't jump when the badges arrive.
function BadgesSkeleton() {
  return (
    <View
      className="flex-row overflow-hidden"
      style={{ gap: BADGE_GAP, marginHorizontal: -EDGE, paddingLeft: EDGE }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          className="items-center gap-2"
          key={i}
          style={{ width: BADGE_WIDTH }}
        >
          <Skeleton
            className="rounded-full"
            style={{ width: 60, height: 60 }}
          />
          <SkeletonText className="w-12" size="xs" />
        </View>
      ))}
    </View>
  );
}
