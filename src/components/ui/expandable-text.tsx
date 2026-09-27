import { useState } from "react";
import { View } from "react-native";

import { TextButton } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";

/**
 * Long text clamped to a few lines, with a "See more" / "See less" toggle
 * only when it actually overflows.
 *
 * Overflow is measured with an invisible, unclamped copy laid out at exactly
 * the visible text's width (read from onLayout). Relying on absolute-position
 * classes for that width let the copy come out narrower, so it wrapped into
 * extra lines and the toggle showed on short text.
 */
export function ExpandableText({
  text,
  lines = 4,
  className = "",
  lineHeightClass = "leading-6",
  moreLabel = "See more",
  lessLabel = "See less",
}: {
  text: string;
  lines?: number;
  className?: string;
  lineHeightClass?: string;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);
  const [overflows, setOverflows] = useState(false);

  return (
    <View className={className}>
      <View
        className="items-start gap-1"
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w !== width) setWidth(w);
        }}
      >
        <ThemedText
          className={lineHeightClass}
          numberOfLines={expanded ? undefined : lines}
          style={{ width: width || undefined }}
          tone="muted"
        >
          {text}
        </ThemedText>

        {overflows ? (
          <TextButton
            label={expanded ? lessLabel : moreLabel}
            onPress={() => setExpanded((v) => !v)}
          />
        ) : null}

        {/* Measuring copy: same text, same width, no line limit. */}
        {width > 0 ? (
          <ThemedText
            accessibilityElementsHidden
            className={lineHeightClass}
            importantForAccessibility="no-hide-descendants"
            onTextLayout={(e) =>
              setOverflows(e.nativeEvent.lines.length > lines)
            }
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              opacity: 0,
            }}
            tone="muted"
          >
            {text}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}
