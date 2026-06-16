import { Image } from "expo-image";
import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { MenuItem } from "../api";
import { formatBirr } from "../menu-format";

// Image on the left, text block on the right (name, description, then price).
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
      ) : (
        <View className="size-14 rounded-xl bg-neutral-100" />
      )}

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
          <ThemedText className="text-red-600" size="xs" weight="medium">
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
