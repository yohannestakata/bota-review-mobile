import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Location01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import { Image } from "expo-image";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import {
  AmenityList,
  BranchHeaderButtons,
  BranchDetailSkeleton,
  BranchHero,
  BranchStickyHeader,
  isOpenNow,
  formatBirr,
  lowestPrice,
  OpeningHours,
  QuickActions,
  ReplyComposerModal,
  ReviewRow,
  SiblingCard,
  totalItemCount,
  useBranch,
  useBranchMenus,
  useBranchSiblings,
  useOwnClaims,
  useReplyActions,
  useReportReview,
} from "@/features/branch";
import { useMe } from "@/features/profile";
import { useSavedBranchIds, useToggleSave } from "@/features/home";
import { Alert } from "@/components/ui/alert";
import { analytics } from "@/lib/analytics";
import { getErrorMessage, priceLabel } from "@/lib/api";
import { useLocation } from "@/lib/use-location";

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

function SectionTitle({ title }: { title: string }) {
  return (
    <ThemedText className="px-6" size="xl" weight="semibold">
      {title}
    </ThemedText>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BranchDetailScreen() {
  const { isSignedIn } = useAuth();
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const branch = useBranch(id);
  const { coords } = useLocation();
  const siblings = useBranchSiblings(id, coords ?? undefined);
  const menus = useBranchMenus(id);
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();
  const { data: ownClaims } = useOwnClaims();

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const isSaved = savedIds?.has(id) ?? false;
  const isOwnBranch =
    ownClaims?.some((c) => c.branchId === id && c.status === "verified") ??
    false;

  // branch_viewed — once per branch entry; `source` carries the originating
  // screen (home, search, saved, collection, …), defaulting to "unknown".
  useEffect(() => {
    if (id) {
      analytics.track("branch_viewed", { branch_id: id, source: source ?? "unknown" });
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
      router.push("/login");
      return;
    }

    action();
  }

  const me = useMe();
  const replyActions = useReplyActions(id);

  const reportReview = useReportReview();
  function onReportReview(reviewId: string) {
    requireSignIn(() => {
      Alert.alert(
        "Report review",
        "Report this review for our team to look into?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Report",
            style: "destructive",
            onPress: () =>
              reportReview.mutate(
                { reviewId },
                {
                  onSuccess: () =>
                    Alert.alert("Thanks", "We'll take a look at this."),
                  onError: (e) =>
                    Alert.alert("Couldn't report", getErrorMessage(e)),
                },
              ),
          },
        ],
      );
    });
  }

  if (branch.isPending) {
    return <BranchDetailSkeleton />;
  }

  if (branch.isError || !branch.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-6">
        <ThemedText size="lg" weight="medium">
          Hmm, couldn&apos;t load this spot
        </ThemedText>
        <Pressable onPress={() => branch.refetch()}>
          <ThemedText tone="brand" weight="semibold">
            Try again
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <ThemedText tone="muted">Go back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const data = branch.data;
  const cover = data.photos[0]?.url ?? null;
  const price = priceLabel(data.priceLevel);
  const hasRating = data.reviewCount > 0;
  const ratingValue = Number(data.rating);
  const eyebrow = [capitalize(data.place.type), data.neighborhood?.name]
    .filter(Boolean)
    .join("  ·  ");
  const chips = [...data.cuisines, ...data.tags];
  const openNow = isOpenNow(data.hours);

  const menuData = menus.data ?? [];
  const menuItemCount = totalItemCount(menuData);
  const menuFrom = lowestPrice(menuData);
  const menuPreview = menuData[0]?.items.slice(0, 3) ?? [];

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 112 }}
        onScroll={onScroll}
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

        <View className="-mt-6 rounded-t-3xl bg-background pt-6">
          {/* Heading */}
          <View className="gap-2 px-6">
            {eyebrow ? (
              <ThemedText size="sm" tone="muted" weight="medium">
                {eyebrow}
              </ThemedText>
            ) : null}
            <View className="flex-row items-center gap-2">
              <ThemedText className="shrink" size="3xl" weight="medium">
                {data.place.name}
              </ThemedText>
              {data.verificationStatus !== "unverified" ? (
                <AppIcon
                  color={colors.success}
                  icon={CheckmarkBadge01Icon}
                  size={20}
                />
              ) : null}
            </View>

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
              {data.hours ? (
                <ThemedText
                  className={openNow ? "text-success" : "text-danger"}
                  weight="medium"
                >
                  {`·  ${openNow ? "Open" : "Closed"}`}
                </ThemedText>
              ) : null}
            </View>

            {data.addressText ? (
              <View className="flex-row items-center gap-1.5">
                <AppIcon color={colors.muted} icon={Location01Icon} size={15} />
                <ThemedText tone="muted">{data.addressText}</ThemedText>
              </View>
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
            <ThemedText className="mt-5 px-6 leading-6" tone="muted">
              {data.place.description}
            </ThemedText>
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
                  <ThemedText size="xl" weight="semibold">
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

                <Pressable
                  className="mt-2 h-12 flex-row items-center justify-center rounded-full border border-placeholder"
                  onPress={() =>
                    router.push({
                      pathname: "/menu/[branchId]",
                      params: { branchId: data.id, name: data.place.name },
                    })
                  }
                >
                  <ThemedText weight="medium">
                    {`See full menu (${menuItemCount} ${menuItemCount === 1 ? "item" : "items"})`}
                  </ThemedText>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* Amenities */}
          {data.amenities.length > 0 ? (
            <>
              <View className="mt-7">
                <Divider />
              </View>
              <View className="mt-6 gap-3 px-6">
                <ThemedText size="xl" weight="semibold">
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
                <ThemedText size="xl" weight="semibold">
                  Hours
                </ThemedText>
                <OpeningHours hours={data.hours} />
              </View>
            </>
          ) : null}

          {/* Photos */}
          {data.photos.length > 0 ? (
            <>
              <View className="mt-7">
                <Divider />
              </View>
              <View className="mt-6 gap-3">
                <SectionTitle title="Photos" />
                <ScrollView
                  contentContainerClassName="gap-3 px-6"
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {data.photos.map((photo, index) => (
                    <Pressable
                      key={photo.id}
                      onPress={() =>
                        router.push(`/branch/${data.id}/photos?index=${index}`)
                      }
                    >
                      <Image
                        contentFit="cover"
                        source={photo.url}
                        style={{ width: 220, height: 150, borderRadius: 16 }}
                        transition={150}
                      />
                    </Pressable>
                  ))}
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
                  <ThemedText size="xl" weight="semibold">
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
                      key={sibling.id}
                      onPress={(b) => router.push(`/branch/${b.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            </>
          ) : null}

          {/* Reviews */}
          <View className="mt-7">
            <Divider />
          </View>
          <View className="mt-6 gap-4 px-6">
            <ThemedText size="xl" weight="semibold">
              Reviews
            </ThemedText>

            {hasRating ? (
              <View className="flex-row items-center gap-4 rounded-2xl bg-surface-muted p-4">
                <ThemedText size="4xl" weight="bold">
                  {ratingValue.toFixed(1)}
                </ThemedText>
                <View className="gap-1">
                  <Stars size={16} value={ratingValue} />
                  <ThemedText size="sm" tone="muted">
                    Based on {data.reviewCount} reviews
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {data.recentReviews.length > 0 ? (
              <View>
                {data.recentReviews.map((review, index) => (
                  <View key={review.id}>
                    {index > 0 ? (
                      <View className="my-5 h-px bg-border" />
                    ) : null}
                    <ReviewRow
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
            ) : (
              <ThemedText tone="muted">
                No reviews yet — be the first to weigh in!
              </ThemedText>
            )}

            {data.reviewCount > data.recentReviews.length ? (
              <Pressable
                className="h-12 flex-row items-center justify-center rounded-full border border-placeholder"
                onPress={() =>
                  router.push({
                    pathname: "/reviews/[branchId]",
                    params: { branchId: data.id, name: data.place.name },
                  })
                }
              >
                <ThemedText weight="medium">
                  See all {data.reviewCount} reviews
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          <View className="mt-8 px-6">
            <Pressable
              className="h-14 flex-row items-center justify-center rounded-full border border-placeholder"
              onPress={() =>
                requireSignIn(() =>
                  router.push({
                    pathname: "/suggest-edit/[branchId]",
                    params: { branchId: data.id, name: data.place.name },
                  }),
                )
              }
            >
              <ThemedText tone="muted" weight="medium">
                Suggest an edit or report closed
              </ThemedText>
            </Pressable>
          </View>

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
                  <ThemedText weight="medium">Manage your listing</ThemedText>
                  <ThemedText size="sm" tone="muted">
                    Update hours, contact info, and photos.
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
                      params: { branchId: data.id, name: data.place.name },
                    }),
                  )
                }
              >
                <View className="mt-0.5">
                  <AppIcon
                    color={colors.foreground}
                    icon={CheckmarkBadge01Icon}
                    size={22}
                  />
                </View>
                <View className="flex-1">
                  <ThemedText weight="medium">
                    Is this your business?
                  </ThemedText>
                  <ThemedText size="sm" tone="muted">
                    Claim it to verify ownership and get a verified badge.
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
        </View>
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
          icon={PencilEdit02Icon}
          label="Write a review"
          onPress={() =>
            requireSignIn(() => router.push(`/review/${data.id}`))
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
