import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  Location01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { colors } from "@/lib/theme";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
  PhotoViewer,
  QuickActions,
  ReviewRow,
  SiblingCard,
  totalItemCount,
  useBranch,
  useBranchMenus,
  useBranchSiblings,
} from "@/features/branch";
import { useSavedBranchIds, useToggleSave } from "@/features/home";
import { priceLabel } from "@/lib/api";
import { useLocation } from "@/lib/use-location";

function Chip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-neutral-100 px-3 py-1.5">
      <ThemedText size="sm">{label}</ThemedText>
    </View>
  );
}

function Divider() {
  return <View className="mx-6 h-px bg-neutral-100" />;
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const branch = useBranch(id);
  const { coords } = useLocation();
  const siblings = useBranchSiblings(id, coords ?? undefined);
  const menus = useBranchMenus(id);
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  const insets = useSafeAreaInsets();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const isSaved = savedIds?.has(id) ?? false;

  if (branch.isPending) {
    return <BranchDetailSkeleton />;
  }

  if (branch.isError || !branch.data) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
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
    <View className="flex-1 bg-white">
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 112 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <BranchHero
          imageUrl={cover}
          onPress={data.photos.length > 0 ? () => setViewerIndex(0) : undefined}
          scrollY={scrollY}
        />

        <View className="-mt-6 rounded-t-3xl bg-white pt-6">
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
                  className={openNow ? "text-green-700" : "text-red-600"}
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
                  className="mt-2 h-12 flex-row items-center justify-center rounded-full border border-border"
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
                      onPress={() => setViewerIndex(index)}
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
                <SectionTitle title="Other locations" />
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
              <View className="flex-row items-center gap-4 rounded-2xl bg-neutral-50 p-4">
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
              data.recentReviews.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))
            ) : (
              <ThemedText tone="muted">
                No reviews yet — be the first to weigh in!
              </ThemedText>
            )}
          </View>

          <View className="mt-8 px-6">
            <Pressable
              className="h-14 flex-row items-center justify-center rounded-full border border-border"
              onPress={() =>
                router.push({
                  pathname: "/suggest-edit/[branchId]",
                  params: { branchId: data.id, name: data.place.name },
                })
              }
            >
              <ThemedText tone="muted" weight="medium">
                Suggest an edit or report closed
              </ThemedText>
            </Pressable>
          </View>

          {/* Owner-targeted claim entry (Google/Yelp pattern): a quiet, distinct
              card low on the page — clear copy + value prop, hidden once the
              branch is owner-verified. */}
          {data.verificationStatus !== "business_verified" ? (
            <View className="mt-4 px-6">
              <Pressable
                className="flex-row items-start gap-3 rounded-2xl border border-border p-4"
                onPress={() =>
                  router.push({
                    pathname: "/claim/[branchId]",
                    params: { branchId: data.id, name: data.place.name },
                  })
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
                    Claim it to manage your listing and get a verified badge.
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
        </View>
      </Animated.ScrollView>

      <BranchStickyHeader scrollY={scrollY} title={data.place.name} />

      <BranchHeaderButtons
        isSaved={isSaved}
        onBack={() => router.back()}
        onToggleSave={() => toggleSave.mutate({ branchId: data.id, isSaved })}
      />

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          icon={PencilEdit02Icon}
          label="Write a review"
          onPress={() => router.push(`/review/${data.id}`)}
          size="sm"
        />
      </View>

      <PhotoViewer
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        photos={data.photos}
        visible={viewerIndex !== null}
      />
    </View>
  );
}
