// Design tokens for JS color props (HugeIcons `color`, inline styles, etc.)
// that can't read CSS variables. This is the subset of the --color-* vars in
// global.css that JS reads directly — the rest are consumed only as Tailwind
// classes (which read the CSS vars). Values must match global.css.
import type { ViewStyle } from "react-native";

export const colors = {
  background: "#fcfaf6",
  surfaceMuted: "#f0ede7",
  border: "#e6e2da",
  placeholder: "#ece7d9",
  foreground: "#171717",
  muted: "#737373",
  subtle: "#d4d4d4",
  inverse: "#ffffff",
  rating: "#f59e0b",
  favorite: "#e11d48",
  success: "#16a34a",
} as const;

export type ColorToken = keyof typeof colors;

// React Native 0.76+ supports cross-platform boxShadow natively. Keep raised
// navigation controls and the primary search affordance consistent here.
export const shadows = {
  navigation: {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 10,
        spreadDistance: 0,
        color: "rgba(23, 23, 23, 0.16)",
      },
    ],
  } satisfies ViewStyle,
  searchBar: {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 5,
        blurRadius: 18,
        spreadDistance: 0,
        color: "rgba(23, 23, 23, 0.10)",
      },
    ],
  } satisfies ViewStyle,
} as const;
