import { Pressable, View } from "react-native";

import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";

import type { MyReview } from "../api";

const STATUS_STYLES: Record<
  MyReview["moderationStatus"],
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pending", bg: "bg-warning-soft", text: "text-warning" },
  approved: { label: "Published", bg: "bg-success-soft", text: "text-success" },
  rejected: { label: "Rejected", bg: "bg-danger-soft", text: "text-danger" },
  archived: { label: "Archived", bg: "bg-surface-muted", text: "text-muted" },
};

function StatusBadge({ status }: { status: MyReview["moderationStatus"] }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
      <ThemedText className={style.text} size="xs" weight="medium">
        {style.label}
      </ThemedText>
    </View>
  );
}

type MyReviewRowProps = {
  review: MyReview;
  onPress: (review: MyReview) => void;
  onEdit: (review: MyReview) => void;
  onDelete: (review: MyReview) => void;
};

export function MyReviewRow({
  review,
  onPress,
  onEdit,
  onDelete,
}: MyReviewRowProps) {
  const canManage = review.moderationStatus !== "archived";

  return (
    <Pressable
      className="gap-2 rounded-2xl border border-placeholder bg-surface p-4"
      onPress={() => onPress(review)}
    >
      <View className="flex-row items-center gap-2">
        <ThemedText className="flex-1" numberOfLines={1} weight="medium">
          {review.branch.label ?? "Place"}
        </ThemedText>
        <StatusBadge status={review.moderationStatus} />
      </View>
      <Stars size={12} value={review.rating} />
      <ThemedText numberOfLines={2} tone="muted">
        {review.text}
      </ThemedText>

      {canManage ? (
        <View className="flex-row gap-5 pt-1">
          <Pressable hitSlop={6} onPress={() => onEdit(review)}>
            <ThemedText size="sm" tone="brand" weight="medium">
              Edit
            </ThemedText>
          </Pressable>
          <Pressable hitSlop={6} onPress={() => onDelete(review)}>
            <ThemedText className="text-danger" size="sm" weight="medium">
              Delete
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}
