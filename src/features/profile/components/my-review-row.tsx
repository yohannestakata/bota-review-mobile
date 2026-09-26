import { View } from "react-native";

import { TextButton } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";

import type { MyReview } from "../api";
import { PressableScale } from "@/components/ui/pressable-scale";

const STATUS_STYLES: Record<
  MyReview["moderationStatus"],
  {
    label: string;
    bg: string;
    tone: "warning" | "success" | "danger" | "muted";
  }
> = {
  pending: { label: "Posted", bg: "bg-warning-soft", tone: "warning" },
  approved: { label: "Published", bg: "bg-success-soft", tone: "success" },
  rejected: { label: "Rejected", bg: "bg-danger-soft", tone: "danger" },
  archived: { label: "Archived", bg: "bg-surface-muted", tone: "muted" },
};

function StatusBadge({ status }: { status: MyReview["moderationStatus"] }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
      <ThemedText size="xs" tone={style.tone} weight="medium">
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
    <PressableScale
      scaleTo={0.985}
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
          <TextButton
            accessibilityLabel="Edit review"
            label="Edit"
            onPress={() => onEdit(review)}
          />
          <TextButton
            accessibilityLabel="Delete review"
            label="Delete"
            onPress={() => onDelete(review)}
            tone="danger"
          />
        </View>
      ) : null}
    </PressableScale>
  );
}
