import {
  Add01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  Location01Icon,
  PencilEdit02Icon,
  SpoonAndForkIcon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useColors } from "@/lib/theme";
import { Image } from "expo-image";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Button, TextButton } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { SectionTitle } from "@/components/ui/section-title";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import {
  AmenityList,
  BranchHeaderButtons,
  BranchDetailSkeleton,
  BranchHero,
  BranchMap,
  BranchStickyHeader,
  openStatus,
  formatBirr,
  lowestPrice,
  OpeningHours,
  QuickActions,
  type RatingBreakdownItem,
  ReplyComposerModal,
  ReviewRow,
  SiblingCard,
  TapToRate,
  totalItemCount,
  useBranch,
  useBranchMenus,
  useBranchSiblings,
  useOwnClaims,
  useReplyActions,
  useReportReview,
} from "@/features/branch";
import { useMe, useMyReviews } from "@/features/profile";
import { useSavedBranchIds, useToggleSave } from "@/features/home";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { analytics } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/api";
import { formatMenuPriceRange } from "@/lib/price";
import { useLocation } from "@/lib/use-location";
import { useRecentlyViewed } from "@/lib/use-recently-viewed";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import {
  flightProgress,
  SHEET_OVERLAP,
  sheetTravel,
} from "@/features/branch/hero-shared";
import {
  usePhotoFlightDone,
  usePhotoFlightTarget,
} from "@/features/branch/shared-photo";
import { promptSignIn } from "@/lib/auth-gate";
import { PressableScale } from "@/components/ui/pressable-scale";

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-surface-muted px-3 py-1.5">
      <ThemedText size="sm">{label}</ThemedText>
    </View>
  );
}

function Divider() {
  return <View className="mx-6 h-px bg-border" />;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Opens the coordinates in the platform's default maps app: Apple Maps on iOS,
// the geo: intent (default maps app) on Android, Google Maps on web.
function openInDefaultMaps(
  latitude: string | null,
  longitude: string | null,
  name: string,
) {
  if (!latitude || !longitude) return;
  const label = encodeURIComponent(name);
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });
  if (url) void Linking.openURL(url);
}

function RatingBreakdown({
  items,
  total,
}: {
  items: RatingBreakdownItem[];
  total: number;
}) {
  return (
    <View className="flex-1 gap-2">
      {items.map((item) => (
        <View className="flex-row items-center gap-2.5" key={item.rating}>
          <ThemedText className="w-2.5" size="xs" tone="muted">
            {item.rating}
          </ThemedText>
          <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full bg-rating"
              style={{
                width:
                  total > 0 && item.count > 0
                    ? `${Math.max(3, Math.min(100, item.percentage))}%`
                    : "0%",
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function BranchDetailScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const { id, source } = useLocalSearchParams<{
    id: string;
    source?: string;
  }>();
  const branch = useBranch(id);
  const recentlyViewed = useRecentlyViewed();
  const { coords } = useLocation();
  const siblings = useBranchSiblings(id, coords ?? undefined);
  const menus = useBranchMenus(id);
  const saved = useSavedBranchIds();
  const savedIds = saved.data;
  const toggleSave = useToggleSave();
  const ownClaims = useOwnClaims();
  const me = useMe();
  const myReviews = useMyReviews();

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  // Opened from a card: its photo flies in (drawn at the app root) to become
  // the hero; the hero hides its own copy until the flight lands.
  usePhotoFlightTarget(id);
  const flightDone = usePhotoFlightDone();
  const { height: screenH } = useWindowDimensions();
  const travel = sheetTravel(screenH);
  const sheetRise = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - flightProgress.get()) * travel }],
  }));
  const [mapActive, setMapActive] = useState(false);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const isSaved = savedIds?.has(id) ?? false;
  const isOwnBranch =
    ownClaims.data?.some((c) => c.branchId === id && c.status === "verified") ??
    false;
  const refresh = useCallback(async () => {
    const tasks: Promise<unknown>[] = [
      branch.refetch(),
      siblings.refetch(),
      menus.refetch(),
    ];
    if (isSignedIn === true) {
      tasks.push(saved.refetch(), ownClaims.refetch(), me.refetch());
    }
    await Promise.all(tasks);
  }, [branch, isSignedIn, me, menus, ownClaims, saved, siblings]);
  const pull = usePullToRefresh(refresh);

  // Remember the visit so Home can later ask "Been to X lately?".
  const placeName = branch.data?.place.name;
  useEffect(() => {
    if (id && placeName) {
      recentlyViewed.add({ id, name: placeName, viewedAt: Date.now() });
    }
    // Record once per branch, not on every recentlyViewed identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, placeName]);

  // branch_viewed — once per branch entry; `source` carries the originating
  // screen (home, search, saved, collection, …), defaulting to "unknown".
  useEffect(() => {
    if (id) {
      analytics.track("branch_viewed", {
        branch_id: id,
        source: source ?? "unknown",
      });
    }
  }, [id, source]);

  // menu_viewed — once the menu section is present (the menu being seen).
  const menuTracked = useRef(false);
  const hasMenuItems = totalItemCount(menus.data ?? []) > 0;
  useEffect(() => {
    if (id && hasMenuItems && !menuTracked.current) {
      menuTracked.current = true;
      analytics.track("menu_viewed", { branch_id: id });
    }
  }, [id, hasMenuItems]);

  function requireSignIn(action: () => void) {
    if (!isSignedIn) {
      promptSignIn(isLoaded);
      return;
    }

    action();
  }

  const replyActions = useReplyActions(id);

  const reportReview = useReportReview();
  function onReportReview(reviewId: string) {
    requireSignIn(() => {
      Alert.alert("Flag this review?", "We'll give it a careful look.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () =>
            reportReview.mutate(
              { reviewId },
              {
                onSuccess: () =>
                  toast.success("Got it", "Thanks for keeping Bota helpful."),
                onError: (e) =>
                  toast.error("Couldn't send report", getErrorMessage(e)),
              },
            ),
        },
      ]);
    });
  }

  if (branch.isPending) {
    return <BranchDetailSkeleton />;
  }

  if (branch.isError || !branch.data) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-background">
        <EmptyState
          action={{ label: "Try again", onPress: () => void branch.refetch() }}
          body="Check your connection and try again. If the place was removed, head back and pick another."
          className=""
          icon={SpoonAndForkIcon}
          secondaryAction={{ label: "Go back", onPress: () => router.back() }}
          title="Hmm, couldn't load this spot"
        />
      </SafeAreaView>
    );
  }

  const data = branch.data;
  // Hero + rail must agree on which photo is the cover: prefer the flagged one,
  // fall back to the first, and keep exactly that photo out of the rail.
  const coverPhoto =
    data.photos.find((photo) => photo.isCover) ?? data.photos[0];
  const cover = coverPhoto?.url ?? null;
  const detailPhotos = data.photos.filter(
    (photo) => photo.id !== coverPhoto?.id,
  );
  const price = formatMenuPriceRange(data.menuPriceRange);
  const hasRating = data.reviewCount > 0;
  const ratingValue = Number(data.rating);
  const eyebrow = [capitalize(data.place.type), data.neighborhood?.name]
    .filter(Boolean)
    .join("  ·  ");
  const chips = [...data.cuisines, ...data.tags];
  // The address without the city (everything here is in Addis), and hidden
  // when it only repeats the neighbourhood the top line already shows.
  const shortAddress = (() => {
    const trimmed = (data.addressText ?? "")
      .replace(/,?\s*addis\s+ababa(,?\s*ethiopia)?\s*$/i, "")
      .trim();
    const area = data.neighborhood?.name?.trim().toLowerCase();
    return trimmed && trimmed.toLowerCase() !== area ? trimmed : null;
  })();
  const mapsUrl =
    data.latitude != null && data.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
      : null;
  const status = openStatus(data.hours);
  // Your own review of this place (any state but archived): the sticky button
  // edits it instead of starting a duplicate, and it's pinned to the top.
  const myReview = myReviews.data?.find(
    (r) => r.branchId === data.id && r.moderationStatus !== "archived",
  );
  const editMyReview = () =>
    myReview && router.push(`/review/${data.id}?reviewId=${myReview.id}`);
  const isMine = (review: { user: { id: string } }) =>
    Boolean(me.data?.id) && review.user.id === me.data?.id;
  const orderedReviews = [
    ...data.recentReviews.filter(isMine),
    ...data.recentReviews.filter((r) => !isMine(r)),
  ];

  const menuData = menus.data ?? [];
  const menuItemCount = totalItemCount(menuData);
  const menuFrom = lowestPrice(menuData);
  const menuPreview = menuData[0]?.items.slice(0, 3) ?? [];

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 112 }}
        onScroll={onScroll}
        // A finger on the map pans the map, not the page.
        scrollEnabled={!mapActive}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void pull.onRefresh()}
            refreshing={pull.refreshing}
            tintColor={colors.primary}
          />
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <BranchHero
          imageUrl={cover}
          onPress={
            data.photos.length > 0
              ? () => router.push(`/branch/${data.id}/photos`)
              : undefined
          }
          scrollY={scrollY}
        />

        {/* Rises from the bottom to meet a card photo flying into the hero. */}
        <Animated.View style={[{ marginTop: -SHEET_OVERLAP }, sheetRise]}>
          <View className="rounded-t-3xl bg-background pt-6">
            {/* Heading */}
            <View className="gap-2 px-6">
              {eyebrow ? (
                <ThemedText size="sm" tone="muted" weight="medium">
                  {eyebrow}
                </ThemedText>
              ) : null}
              <ThemedText className="shrink" size="3xl" weight="bold">
                {data.place.name}
              </ThemedText>

              <View className="flex-row items-center gap-2">
                <Stars size={16} value={ratingValue} />
                {hasRating ? (
                  <ThemedText weight="medium">
                    {ratingValue.toFixed(1)}{" "}
                    <ThemedText tone="muted" weight="normal">
                      ({data.reviewCount})
                    </ThemedText>
                  </ThemedText>
                ) : (
                  <ThemedText tone="muted">New</ThemedText>
                )}
                {price ? (
                  <ThemedText tone="muted">{`·  ${price}`}</ThemedText>
                ) : null}
              </View>

              {/* Open status and address on one row. The status is short and
                what people check first, so it never truncates; the address
                takes what's left and ends in "..." if it's long. */}
              {status || shortAddress ? (
                <View className="flex-row items-center gap-4">
                  {status ? (
                    <View className="shrink-0 flex-row items-center gap-1.5">
                      <AppIcon
                        color={
                          {
                            success: colors.success,
                            warning: colors.warning,
                            danger: colors.danger,
                          }[status.tone]
                        }
                        icon={Clock01Icon}
                        size={16}
                      />
                      <ThemedText
                        numberOfLines={1}
                        tone={status.tone}
                        weight="medium"
                      >
                        {status.label}
                      </ThemedText>
                    </View>
                  ) : null}
                  {shortAddress ? (
                    <Pressable
                      accessibilityLabel={`Address: ${shortAddress}. Get directions`}
                      accessibilityRole="link"
                      className="flex-1 flex-row items-center gap-1.5"
                      disabled={!mapsUrl}
                      hitSlop={8}
                      onPress={() => mapsUrl && void Linking.openURL(mapsUrl)}
                    >
                      <AppIcon
                        color={colors.muted}
                        icon={Location01Icon}
                        size={16}
                      />
                      <ThemedText
                        className="shrink"
                        numberOfLines={1}
                        tone="muted"
                      >
                        {shortAddress}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {data.verificationStatus === "business_verified" ? (
                <ThemedText size="sm" tone="brand" weight="medium">
                  Owner verified
                </ThemedText>
              ) : null}
            </View>

            {/* Quick actions */}
            <View className="mt-5 px-6">
              <QuickActions
                branchId={data.id}
                latitude={data.latitude}
                longitude={data.longitude}
                name={data.place.name}
                phone={data.phone}
              />
            </View>

            {/* Description */}
            {data.place.description ? (
              <ExpandableText
                className="mt-5 px-6"
                key={data.place.description}
                text={data.place.description}
              />
            ) : null}

            {/* Cuisines + tags */}
            {chips.length > 0 ? (
              <View className="mt-5 flex-row flex-wrap gap-2 px-6">
                {chips.map((chip) => (
                  <Chip key={chip.id} label={chip.name} />
                ))}
              </View>
            ) : null}

            {/* Menu */}
            {menuItemCount > 0 ? (
              <>
                <View className="mt-7">
                  <Divider />
                </View>
                <View className="mt-6 gap-2 px-6">
                  <View className="flex-row items-center justify-between">
                    <ThemedText size="xl" weight="bold">
                      Menu
                    </ThemedText>
                    {menuFrom ? (
                      <ThemedText size="sm" tone="muted">
                        from {menuFrom}
                      </ThemedText>
                    ) : null}
                  </View>

                  {menuPreview.map((item) => (
                    <View
                      className="flex-row items-center justify-between gap-3"
                      key={item.id}
                    >
                      <ThemedText className="shrink" numberOfLines={1}>
                        {item.name}
                      </ThemedText>
                      <ThemedText tone="muted">
                        {formatBirr(item.price)}
                      </ThemedText>
                    </View>
                  ))}

                  <Button
                    className="mt-2"
                    label={`See full menu (${menuItemCount} ${
                      menuItemCount === 1 ? "item" : "items"
                    })`}
                    onPress={() =>
                      router.push({
                        pathname: "/menu/[branchId]",
                        params: { branchId: data.id, name: data.place.name },
                      })
                    }
                    size="sm"
                    variant="outline"
                  />
                </View>
              </>
            ) : null}

            {/* Below the fold: built once a card photo has landed, so the
                flight isn't competing with them for frames. */}
            {flightDone ? (
              <>
                {/* Amenities */}
                {data.amenities.length > 0 ? (
                  <>
                    <View className="mt-7">
                      <Divider />
                    </View>
                    <View className="mt-6 gap-3 px-6">
                      <ThemedText size="xl" weight="bold">
                        Amenities
                      </ThemedText>
                      <AmenityList amenities={data.amenities} />
                    </View>
                  </>
                ) : null}

                {/* Hours */}
                {data.hours ? (
                  <>
                    <View className="mt-7">
                      <Divider />
                    </View>
                    <View className="mt-6 gap-3 px-6">
                      <ThemedText size="xl" weight="bold">
                        Hours
                      </ThemedText>
                      <OpeningHours hours={data.hours} />
                    </View>
                  </>
                ) : null}

                {/* Location */}
                {data.latitude && data.longitude ? (
                  <>
                    <View className="mt-7">
                      <Divider />
                    </View>
                    <View className="mt-6 gap-3 px-6">
                      <View className="flex-row items-center justify-between">
                        <ThemedText size="xl" weight="bold">
                          Location
                        </ThemedText>
                        <Button
                          label="Open in Maps"
                          onPress={() =>
                            openInDefaultMaps(
                              data.latitude,
                              data.longitude,
                              data.place.name,
                            )
                          }
                          rightIcon={ArrowRight01Icon}
                          size="xs"
                          variant="ghost"
                        />
                      </View>
                      <BranchMap
                        latitude={data.latitude}
                        longitude={data.longitude}
                        onInteractionChange={setMapActive}
                      />
                    </View>
                  </>
                ) : null}

                {/* Photos */}
                {detailPhotos.length > 0 ? (
                  <>
                    <View className="mt-7">
                      <Divider />
                    </View>
                    <View className="mt-6 gap-3">
                      <SectionTitle className="px-6">Photos</SectionTitle>
                      <ScrollView
                        contentContainerClassName="gap-3 px-6"
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {detailPhotos.map((photo) => {
                          const galleryIndex = data.photos.findIndex(
                            (item) => item.id === photo.id,
                          );
                          return (
                            <PressableScale
                              accessibilityLabel={`Photo ${galleryIndex + 1}, open gallery`}
                              accessibilityRole="imagebutton"
                              key={photo.id}
                              onPress={() =>
                                router.push(
                                  `/branch/${data.id}/photos?index=${galleryIndex}`,
                                )
                              }
                            >
                              <Image
                                contentFit="cover"
                                source={photo.url}
                                style={{
                                  width: 220,
                                  height: 150,
                                  borderRadius: 16,
                                }}
                                transition={150}
                              />
                            </PressableScale>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </>
                ) : null}

                {/* Other locations of the same place (chains) */}
                {siblings.data && siblings.data.length > 0 ? (
                  <>
                    <View className="mt-7">
                      <Divider />
                    </View>
                    <View className="mt-6 gap-3">
                      <View className="flex-row items-center justify-between px-6">
                        <ThemedText size="xl" weight="bold">
                          Other locations
                        </ThemedText>
                        <Pressable
                          hitSlop={8}
                          onPress={() => router.push(`/place/${data.place.id}`)}
                        >
                          <ThemedText tone="brand" weight="semibold">
                            See all
                          </ThemedText>
                        </Pressable>
                      </View>
                      <ScrollView
                        contentContainerClassName="gap-3 px-6"
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {siblings.data.map((sibling) => (
                          <SiblingCard
                            branch={sibling}
                            isSaved={savedIds?.has(sibling.id)}
                            key={sibling.id}
                            onPress={(b) => router.push(`/branch/${b.id}`)}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  </>
                ) : siblings.isSuccess ? (
                  <>
                    <View className="mt-7">
                      <Divider />
                    </View>
                    <View className="mt-6 px-6">
                      <Pressable
                        className="flex-row items-center gap-3 rounded-2xl border border-placeholder p-4"
                        onPress={() =>
                          router.push({
                            pathname: "/submissions",
                            params: {
                              placeId: data.place.id,
                              placeName: data.place.name,
                            },
                          })
                        }
                      >
                        <AppIcon
                          color={colors.foreground}
                          icon={Add01Icon}
                          size={20}
                        />
                        <View className="flex-1">
                          <ThemedText weight="medium">
                            Add another location
                          </ThemedText>
                          <ThemedText size="sm" tone="muted">
                            Know another {data.place.name} spot? Put it on Bota.
                          </ThemedText>
                        </View>
                      </Pressable>
                    </View>
                  </>
                ) : null}

                {/* Reviews */}
                <View className="mt-7">
                  <Divider />
                </View>
                <View className="mt-6 gap-4 px-6">
                  <ThemedText size="xl" weight="bold">
                    Reviews
                  </ThemedText>

                  {hasRating ? (
                    <View className="rounded-2xl bg-surface-muted p-4">
                      <View className="flex-row items-center gap-5">
                        <View className="items-start gap-1">
                          <ThemedText size="4xl" weight="bold">
                            {ratingValue.toFixed(1)}
                          </ThemedText>
                          <Stars size={16} value={ratingValue} />
                          <ThemedText size="sm" tone="muted">
                            {data.reviewCount}{" "}
                            {data.reviewCount === 1 ? "review" : "reviews"}
                          </ThemedText>
                        </View>
                        <RatingBreakdown
                          items={data.ratingBreakdown ?? []}
                          total={data.reviewCount}
                        />
                      </View>
                    </View>
                  ) : null}

                  {myReview && !orderedReviews.some(isMine) ? (
                    // Yours isn't listed yet (awaiting a check, or sent back).
                    <View className="flex-row items-center gap-3 rounded-2xl bg-surface-muted px-4 py-4">
                      <View className="flex-1">
                        <ThemedText weight="semibold">
                          Your review is in
                        </ThemedText>
                        <ThemedText className="mt-0.5" size="sm" tone="muted">
                          {myReview.moderationStatus === "rejected"
                            ? "It needs a few changes before it can go up."
                            : "It'll show here after a quick check."}
                        </ThemedText>
                      </View>
                      <TextButton label="Edit" onPress={editMyReview} />
                    </View>
                  ) : null}

                  {orderedReviews.length > 0 ? (
                    <View>
                      {orderedReviews.map((review, index) => (
                        <View key={review.id}>
                          {index > 0 ? (
                            <View className="my-5 h-px bg-border" />
                          ) : null}
                          {isMine(review) ? (
                            <View className="mb-3 flex-row items-center justify-between">
                              <ThemedText
                                size="xs"
                                tone="brand"
                                weight="semibold"
                              >
                                YOUR REVIEW
                              </ThemedText>
                              <TextButton label="Edit" onPress={editMyReview} />
                            </View>
                          ) : null}
                          <ReviewRow
                            businessAvatarUrl={
                              data.place.avatarUrl ?? undefined
                            }
                            businessName={data.place.name}
                            currentUserId={me.data?.id}
                            onReply={
                              isSignedIn ? replyActions.startReply : undefined
                            }
                            onReportReply={
                              isSignedIn ? replyActions.reportReply : undefined
                            }
                            onReport={onReportReview}
                            onUserPress={(userId) =>
                              router.push(`/profile/${userId}` as Href)
                            }
                            review={review}
                          />
                        </View>
                      ))}
                    </View>
                  ) : isOwnBranch ? (
                    <ThemedText tone="muted">
                      No reviews yet. They&apos;ll show up here as guests weigh
                      in.
                    </ThemedText>
                  ) : myReview ? null : (
                    <View className="items-center rounded-2xl bg-surface-muted px-4 py-5">
                      <ThemedText weight="semibold">
                        Be the first to review
                      </ThemedText>
                      <ThemedText
                        className="mt-1 text-center"
                        size="sm"
                        tone="muted"
                      >
                        Tap or slide to rate your visit.
                      </ThemedText>
                      <View className="mt-3">
                        <TapToRate
                          onRate={(star) =>
                            requireSignIn(() =>
                              router.push(`/review/${data.id}?rating=${star}`),
                            )
                          }
                        />
                      </View>
                    </View>
                  )}

                  {data.reviewCount > data.recentReviews.length ? (
                    <Button
                      label={`See all ${data.reviewCount} reviews`}
                      onPress={() =>
                        router.push({
                          pathname: "/reviews/[branchId]",
                          params: { branchId: data.id, name: data.place.name },
                        })
                      }
                      size="sm"
                      variant="outline"
                    />
                  ) : null}
                </View>

                {!isOwnBranch ? (
                  <View className="mt-8 px-6">
                    <Button
                      label="Suggest an edit or report closed"
                      onPress={() =>
                        requireSignIn(() =>
                          router.push({
                            pathname: "/suggest-edit/[branchId]",
                            params: {
                              branchId: data.id,
                              name: data.place.name,
                            },
                          }),
                        )
                      }
                      size="sm"
                      tone="muted"
                      variant="outline"
                    />
                  </View>
                ) : null}

                {isOwnBranch ? (
                  <View className="mt-4 px-6">
                    <Pressable
                      className="flex-row items-center justify-between rounded-2xl border border-placeholder bg-surface p-4"
                      onPress={() =>
                        router.push({
                          pathname: "/branch/[id]/manage",
                          params: { id: data.id },
                        })
                      }
                    >
                      <View className="flex-1">
                        <ThemedText weight="medium">
                          Manage your listing
                        </ThemedText>
                        <ThemedText size="sm" tone="muted">
                          Update details, menu, hours, and photos.
                        </ThemedText>
                      </View>
                      <AppIcon
                        color={colors.muted}
                        icon={ArrowRight01Icon}
                        size={18}
                      />
                    </Pressable>
                  </View>
                ) : null}

                {/* Owner-targeted claim entry (Google/Yelp pattern): a quiet, distinct
              card low on the page — clear copy + value prop, hidden once the
              branch is owner-verified. */}
                {data.verificationStatus !== "business_verified" ? (
                  <View className="mt-4 px-6">
                    <Pressable
                      className="flex-row items-start gap-3 rounded-2xl border border-placeholder p-4"
                      onPress={() =>
                        requireSignIn(() =>
                          router.push({
                            pathname: "/claim/[branchId]",
                            params: {
                              branchId: data.id,
                              name: data.place.name,
                            },
                          }),
                        )
                      }
                    >
                      <View className="mt-0.5">
                        <AppIcon
                          color={colors.foreground}
                          icon={PencilEdit02Icon}
                          size={22}
                        />
                      </View>
                      <View className="flex-1">
                        <ThemedText weight="medium">
                          Is this your business?
                        </ThemedText>
                        <ThemedText size="sm" tone="muted">
                          Claim it to verify ownership and manage listing
                          details.
                        </ThemedText>
                      </View>
                      <View className="mt-0.5">
                        <AppIcon
                          color={colors.muted}
                          icon={ArrowRight01Icon}
                          size={18}
                        />
                      </View>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <BranchStickyHeader scrollY={scrollY} title={data.place.name} />

      <BranchHeaderButtons
        isSaved={isSaved}
        onBack={() => router.back()}
        onToggleSave={() =>
          requireSignIn(() => {
            analytics.track(isSaved ? "branch_unsaved" : "branch_saved", {
              branch_id: data.id,
            });
            toggleSave.mutate({ branchId: data.id, isSaved });
          })
        }
      />

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-placeholder bg-background px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={myReview ? "Edit your review" : "Write a review"}
          onPress={() =>
            myReview
              ? editMyReview()
              : requireSignIn(() => router.push(`/review/${data.id}`))
          }
          size="sm"
        />
      </View>

      <ReplyComposerModal
        onClose={replyActions.closeComposer}
        onSubmit={replyActions.submit}
        submitting={replyActions.submitting}
        target={replyActions.target}
      />
    </View>
  );
}
