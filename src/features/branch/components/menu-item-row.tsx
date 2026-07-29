import { Image } from "expo-image";
import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { MenuItem } from "../api";
import { formatBirr } from "../menu-format";

export function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <View className="flex-row items-start gap-3 py-3">
      {item.imageUrl ? (
        <Image
          contentFit="cover"
          source={item.imageUrl}
          style={{ width: 56, height: 56, borderRadius: 12 }}
          transition={150}
        />
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
