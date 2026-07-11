import { useAuth, useClerk, useUser } from "@clerk/clerk-expo";
import {
  ArrowRight01Icon,
  Building01Icon,
  Comment01Icon,
  Logout01Icon,
  Notification01Icon,
  Share08Icon,
  StarIcon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { type ComponentProps, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthRequiredScreen } from "@/components/auth/auth-required-screen";
import { LegalLinks } from "@/components/legal-links";
import { Avatar } from "@/components/ui/avatar";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useOwnClaims } from "@/features/branch";
import { useSavedBranchIds } from "@/features/home";
import {
  ProfileCompletionCard,
  useMe,
  useMyReplies,
  useMyReviews,
} from "@/features/profile";
import { colors } from "@/lib/theme";

type IconType = ComponentProps<typeof AppIcon>["icon"];

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-0.5 rounded-2xl border border-placeholder bg-surface py-3">
      <ThemedText size="xl" weight="bold">
        {value}
      </ThemedText>
      <ThemedText size="sm" tone="muted">
        {label}
      </ThemedText>
    </View>
  );
}

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
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const me = useMe();
  const { data: savedIds } = useSavedBranchIds();
  const claims = useOwnClaims();
  const replies = useMyReplies();
  const reviews = useMyReviews();
  const [loggingOut, setLoggingOut] = useState(false);

  const name = user?.fullName ?? user?.firstName ?? "You";
  const handle =
    user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const trustLevel = me.data?.trustLevel;
  const role = me.data?.role;
  const savedCount = savedIds?.size ?? 0;
  const reviewCount = reviews.data?.length ?? 0;
  const replyCount = replies.data?.length ?? 0;
  const claimCount = claims.data?.length ?? 0;

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
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
                {trustLevel ? (
                  <View className="rounded-full bg-surface-muted px-2 py-0.5">
                    <ThemedText size="xs" tone="muted" weight="medium">
                      {trustLevel}
                    </ThemedText>
                  </View>
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

          {/* Stats */}
          <View className="mt-5 flex-row gap-3">
            <StatCard label="Reviews" value={reviewCount} />
            <StatCard label="Saved" value={savedCount} />
            <Pressable
              className="flex-1 items-center justify-center gap-1 rounded-2xl border border-placeholder bg-surface py-3"
              onPress={() =>
                void Share.share({
                  message: `See my food finds on Bota — ${name}`,
                })
              }
            >
              <AppIcon color={colors.foreground} icon={Share08Icon} size={22} />
              <ThemedText size="sm" weight="medium">
                Share
              </ThemedText>
            </Pressable>
          </View>

          <ProfileCompletionCard />
        </View>

        {/* Menu */}
        <View className="mt-6">
          <MenuRow
            count={reviewCount}
            icon={StarIcon}
            label="Your reviews"
            onPress={() => router.push("/profile/reviews")}
          />
          <RowDivider />
          <MenuRow
            count={replyCount}
            icon={Comment01Icon}
            label="Your replies"
            onPress={() => router.push("/profile/replies")}
          />
          <RowDivider />
          <MenuRow
            count={claimCount}
            icon={Building01Icon}
            label="My business"
            onPress={() => router.push("/profile/claims")}
          />
          <RowDivider />
          <MenuRow
            icon={Notification01Icon}
            label="Meal reminders"
            onPress={() => router.push("/profile/notifications")}
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
