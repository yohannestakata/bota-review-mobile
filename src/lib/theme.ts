// Design tokens for JS color props (HugeIcons `color`, inline styles, etc.)
// that can't read CSS variables. This is the subset of the --color-* vars in
// global.css that JS reads directly — the rest are consumed only as Tailwind
// classes (which read the CSS vars). Values must match global.css.
import type { ViewStyle } from "react-native";

export const colors = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f5f6f2",
  border: "#e4e7df",
  placeholder: "#edf0ea",
  foreground: "#1f241f",
  muted: "#6b7068",
  subtle: "#c8cec3",
  primary: "#004733",
  inverse: "#ffffff",
  rating: "#004733",
  favorite: "#e11d48",
  success: "#00885f",
} as const;

export type ColorToken = keyof typeof colors;

// React Native 0.76+ supports cross-platform boxShadow natively. Keep raised
// navigation controls and the primary search affordance consistent here.
export const shadows = {
  navigation: {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 18,
        spreadDistance: 0,
        color: "rgba(31, 36, 31, 0.14)",
      },
    ],
  } satisfies ViewStyle,
  searchBar: {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 7,
        blurRadius: 22,
        spreadDistance: 0,
        color: "rgba(31, 36, 31, 0.12)",
      },
    ],
  } satisfies ViewStyle,
  cardControl: {
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 3,
        blurRadius: 12,
        spreadDistance: 0,
        color: "rgba(31, 36, 31, 0.14)",
      },
    ],
  } satisfies ViewStyle,
} as const;
