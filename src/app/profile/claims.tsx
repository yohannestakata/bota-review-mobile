import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/ui/screen-header";
import { FlashList, ListGapSm } from "@/components/ui/flash-list";
import { ListErrorState } from "@/components/ui/list-state-placeholder";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemedText } from "@/components/ui/themed-text";
import { useOwnClaims, type OwnClaim } from "@/features/branch";
import { formatRelativeDate } from "@/lib/format-date";

const STATUS_LABEL: Record<OwnClaim["status"], string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Not approved",
};

const STATUS_TONE: Record<OwnClaim["status"], "muted" | "brand" | "danger"> = {
  pending: "muted",
  verified: "brand",
  rejected: "danger",
};

function ClaimCard({ claim }: { claim: OwnClaim }) {
  return (
    <Pressable
      className="gap-1.5 rounded-2xl border border-placeholder bg-surface p-4"
      onPress={() => router.push(`/branch/${claim.branchId}`)}
    >
      <ThemedText weight="medium">
        {claim.branch.label ?? claim.branch.slug}
      </ThemedText>
      <View className="flex-row items-center gap-2">
        <ThemedText size="sm" tone={STATUS_TONE[claim.status]} weight="medium">
          {STATUS_LABEL[claim.status]}
        </ThemedText>
        <ThemedText size="sm" tone="muted">
          · Submitted {formatRelativeDate(claim.createdAt)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function MyClaimsScreen() {
  const claims = useOwnClaims();
  const data = claims.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader title="My business" />

      {claims.isPending ? (
        <View className="gap-3 px-6 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-20 w-full rounded-2xl" key={i} />
          ))}
        </View>
      ) : claims.isError ? (
        <ListErrorState
          errorText="Couldn't load your claims."
          onRetry={() => claims.refetch()}
        />
      ) : data.length === 0 ? (
        <EmptyState
          action={{
            label: "Find your business",
            onPress: () => router.navigate("/search"),
          }}
          body="Own a spot? Find it on Bota and tap the claim card near the bottom of its page to manage the listing and reply as the owner."
          icon={CheckmarkBadge01Icon}
          title="No businesses claimed"
        />
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-2"
          data={data}
          ItemSeparatorComponent={ListGapSm}
          keyExtractor={(item) => item.id}
          onRefresh={() => claims.refetch()}
          refreshing={claims.isFetching && !claims.isPending}
          renderItem={({ item }) => <ClaimCard claim={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
