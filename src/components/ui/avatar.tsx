import { Image } from "expo-image";
import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

function initialsOf(name?: string | null): string {
  if (!name) {
    return "?";
  }
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ uri, name, size = 64 }: AvatarProps) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-neutral-200"
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image
          contentFit="cover"
          source={uri}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <ThemedText style={{ fontSize: size * 0.36 }} weight="semibold">
          {initialsOf(name)}
        </ThemedText>
      )}
    </View>
  );
}
