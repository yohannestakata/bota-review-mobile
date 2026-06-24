import { FlashList, type FlashListProps } from "@shopify/flash-list";
import { cssInterop } from "nativewind";
import { View } from "react-native";

// FlashList isn't a core RN component, so NativeWind doesn't map its className
// props out of the box. Register the interop once here and re-export, so screens
// can keep using `contentContainerClassName` exactly like they did with FlatList
// (03-mobile-standards.md: use FlashList, never FlatList).
cssInterop(FlashList, {
  className: { target: "style" },
  contentContainerClassName: { target: "contentContainerStyle" },
});

// FlashList recycles items and ignores `contentContainerStyle.gap` for spacing
// between rows — use these as `ItemSeparatorComponent` instead. Defined at module
// scope so identities are stable across renders.
export const ListGapSm = () => <View className="h-3" />; // 12px (was gap-3)
export const ListGapMd = () => <View className="h-4" />; // 16px (was gap-4)
export const ListGapLg = () => <View className="h-5" />; // 20px (was gap-5)

export { FlashList };
export type { FlashListProps };
