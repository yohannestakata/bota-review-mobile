import { SpoonAndForkIcon } from "@hugeicons/core-free-icons";
import { View } from "react-native";

import { Photo } from "@/components/ui/photo";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors } from "@/lib/theme";
import type { MenuItem } from "../api";
import { formatBirr } from "../menu-format";

export function MenuItemRow({
  item,
  showImage,
}: {
  item: MenuItem;
  showImage: boolean;
}) {
  const colors = useColors();
  return (
    <View className="flex-row items-start gap-3 py-3">
      {showImage ? (
        item.imageUrl ? (
          <Photo
            displayWidth={56}
            style={{ width: 56, height: 56, borderRadius: 12 }}
            transition={150}
            uri={item.imageUrl}
          />
        ) : (
          <View className="size-14 items-center justify-center rounded-xl bg-primary/10">
            <AppIcon color={colors.primary} icon={SpoonAndForkIcon} size={22} />
          </View>
        )
      ) : null}

      <View className="flex-1 gap-0.5">
        <ThemedText
          tone={item.isAvailable ? "default" : "muted"}
          weight="medium"
        >
          {item.name}
        </ThemedText>
        {item.sizes ? (
          <ThemedText size="sm" weight="medium">
            {item.sizes
              .map((size) => `${size.label} ${formatBirr(size.price)}`)
              .join(" · ")}
          </ThemedText>
        ) : null}
        {item.description ? (
          <ThemedText numberOfLines={2} size="sm" tone="muted">
            {item.description}
          </ThemedText>
        ) : null}
        {!item.isAvailable ? (
          <ThemedText size="xs" tone="danger" weight="medium">
            Currently unavailable
          </ThemedText>
        ) : null}
      </View>

      {item.sizes ? null : (
        <ThemedText className="w-16 text-right" weight="medium">
          {formatBirr(item.price)}
        </ThemedText>
      )}
    </View>
  );
}
