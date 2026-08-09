import { SpoonAndForkIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";
import type { MenuItem } from "../api";
import { formatBirr } from "../menu-format";

export function MenuItemRow({
  item,
  showImage,
}: {
  item: MenuItem;
  showImage: boolean;
}) {
  return (
    <View className="flex-row items-start gap-3 py-3">
      {showImage ? (
        item.imageUrl ? (
          <Image
            contentFit="cover"
            source={item.imageUrl}
            style={{ width: 56, height: 56, borderRadius: 12 }}
            transition={150}
          />
        ) : (
          <View className="size-14 items-center justify-center rounded-xl bg-primary/10">
            <AppIcon color={colors.primary} icon={SpoonAndForkIcon} size={22} />
          </View>
        )
      ) : null}

      <View className="flex-1 gap-0.5">
        <ThemedText
          className={item.isAvailable ? "" : "text-muted"}
          weight="medium"
        >
          {item.name}
        </ThemedText>
        {item.description ? (
          <ThemedText numberOfLines={2} size="sm" tone="muted">
            {item.description}
          </ThemedText>
        ) : null}
        {!item.isAvailable ? (
          <ThemedText className="text-danger" size="xs" weight="medium">
            Currently unavailable
          </ThemedText>
        ) : null}
      </View>

      <ThemedText className="w-16 text-right" weight="medium">
        {formatBirr(item.price)}
      </ThemedText>
    </View>
  );
}
