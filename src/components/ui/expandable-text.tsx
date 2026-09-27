import { useState } from "react";
import { View } from "react-native";

import { TextButton } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";

/**
 * Long text clamped to a few lines, with "See more" / "See less" only when it
 * actually overflows (measured with an invisible full-length copy).
 */
export function ExpandableText({
  text,
  lines = 4,
  className = "",
}: {
  text: string;
  lines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState<boolean | null>(null);

  return (
    <View className={`relative items-start gap-1 ${className}`}>
      <ThemedText
        className="leading-6"
        numberOfLines={expanded ? undefined : lines}
        tone="muted"
      >
        {text}
      </ThemedText>

      {overflows === null ? (
        <ThemedText
          accessibilityElementsHidden
          className="absolute inset-x-0 leading-6 opacity-0"
          importantForAccessibility="no-hide-descendants"
          onTextLayout={(event) =>
            setOverflows(event.nativeEvent.lines.length > lines)
          }
          pointerEvents="none"
          tone="muted"
        >
          {text}
        </ThemedText>
      ) : null}

      {overflows ? (
        <TextButton
          label={expanded ? "See less" : "See more"}
          onPress={() => setExpanded((v) => !v)}
        />
      ) : null}
    </View>
  );
}
