import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import {
  ArrowRight01Icon,
  Building01Icon,
  Comment01Icon,
  FavouriteIcon,
  Logout01Icon,
  StarIcon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { type ComponentProps, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthRequiredScreen } from "@/components/auth/auth-required-screen";
import { LegalLinks } from "@/components/legal-links";
import { Avatar } from "@/components/ui/avatar";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useOwnClaims } from "@/features/branch";
import {
  ProfileBadges,
  useMe,
  useMyReplies,
  useMyReviews,
} from "@/features/profile";
import { clearPushRegistration } from "@/lib/push-registration";
import { colors } from "@/lib/theme";

type IconType = ComponentProps<typeof AppIcon>["icon"];

function MenuRow({
  icon,
  label,
  count,
  onPress,
  tone = "default",
  showChevron = true,
  loading = false,
}: {
  icon: IconType;
  label: string;
  count?: number;
  onPress: () => void;
  tone?: "default" | "muted";
  showChevron?: boolean;
  loading?: boolean;
}) {
  const muted = tone === "muted";
  return (
    <Pressable
      className="flex-row items-center gap-3 px-6 py-4"
      disabled={loading}
      onPress={onPress}
    >
      <AppIcon
        color={muted ? colors.muted : colors.foreground}
        icon={icon}
        size={20}
      />
      <ThemedText
        className="flex-1"
        tone={muted ? "muted" : "default"}
        weight="medium"
      >
        {label}
      </ThemedText>
      {loading ? (
        <ActivityIndicator color={colors.muted} />
      ) : count ? (
        <ThemedText tone="muted">{count}</ThemedText>
      ) : null}
      {showChevron ? (
        <AppIcon color={colors.muted} icon={ArrowRight01Icon} size={18} />
      ) : null}
    </Pressable>
  );
}

function RowDivider() {
  return <View className="ml-16 h-px bg-border" />;
}

export default function ProfileScreen() {
  const { isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const me = useMe();
  const claims = useOwnClaims();
  const replies = useMyReplies();
  const reviews = useMyReviews();
  const [loggingOut, setLoggingOut] = useState(false);

  const name = user?.fullName ?? user?.firstName ?? "You";
  const handle =
    user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const role = me.data?.role;
  // Deleted reviews are archived, not removed — don't count them.
  const reviewCount =
    reviews.data?.filter((r) => r.moderationStatus !== "archived").length ?? 0;
  const replyCount = replies.data?.length ?? 0;
  const claimCount = claims.data?.length ?? 0;

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // Drop this device's push token while we still have a valid auth token.
      await clearPushRegistration(getToken);
      await signOut();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  if (!isSignedIn) {
    return (
      <AuthRequiredScreen
        body="Sign in to manage your reviews, saves, and account."
        title="Welcome to Bota"
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-10 pt-4">
        {/* Header */}
        <View className="px-6">
          <View className="flex-row items-center gap-4">
            <Avatar name={name} size={64} uri={user?.imageUrl} />
            <View className="flex-1 gap-1">
              <ThemedText numberOfLines={1} size="xl" weight="semibold">
                {name}
              </ThemedText>
              <View className="flex-row items-center gap-2">
                {handle ? (
                  <ThemedText className="shrink" numberOfLines={1} tone="muted">
                    {handle}
                  </ThemedText>
                ) : null}
                {role && role !== "user" ? (
                  <View className="rounded-full bg-primary px-2 py-0.5">
                    <ThemedText size="xs" tone="inverse" weight="medium">
                      {role}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View className="mt-6">
            <ProfileBadges />
          </View>
        </View>

        {/* Menu */}
        <View className="mt-6">
          <MenuRow
            count={reviewCount}
            icon={StarIcon}
            label="Your reviews"
            onPress={() => router.push("/profile/reviews")}
          />
          {/* Only once there's something there — replies are written on a
              place's page, and claims start from its claim card. */}
          {replyCount > 0 ? (
            <>
              <RowDivider />
              <MenuRow
                count={replyCount}
                icon={Comment01Icon}
                label="Your replies"
                onPress={() => router.push("/profile/replies")}
              />
            </>
          ) : null}
          {claimCount > 0 ? (
            <>
              <RowDivider />
              <MenuRow
                count={claimCount}
                icon={Building01Icon}
                label="My business"
                onPress={() => router.push("/profile/claims")}
              />
            </>
          ) : null}
          <RowDivider />
          <MenuRow
            icon={FavouriteIcon}
            label="Your tastes"
            onPress={() => router.push("/profile/tastes")}
          />
          <RowDivider />
          <MenuRow
            icon={UserEdit01Icon}
            label="Edit profile"
            onPress={() => router.push("/profile/edit")}
          />
          <RowDivider />
          <MenuRow
            icon={Logout01Icon}
            label="Log out"
            loading={loggingOut}
            onPress={onLogout}
            showChevron={false}
            tone="muted"
          />
        </View>

        {/* Footer */}
        <View className="mt-8 px-6">
          <LegalLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
