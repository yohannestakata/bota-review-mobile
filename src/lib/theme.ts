// Design tokens for JS color props (HugeIcons `color`, inline styles, etc.)
// that can't read CSS variables. This is the subset of the --color-* vars in
// global.css that JS reads directly — the rest are consumed only as Tailwind
// classes (which read the CSS vars). Values must match global.css.
import { Appearance, useColorScheme, type ViewStyle } from "react-native";

const light = {
  background: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#f5f6f2",
  border: "#e4e7df",
  placeholder: "#edf0ea",
  foreground: "#1f241f",
  heading: "#10251e",
  muted: "#6b7068",
  subtle: "#c8cec3",
  primary: "#004733",
  personalized: "#eef7f1",
  accent: "#c98712",
  accentSoft: "#fff1c7",
  inverse: "#ffffff",
  rating: "#004733",
  favorite: "#e11d48",
  success: "#00885f",
  danger: "#dc2626",
  // Floating pills (toast, offline) — dark in both schemes, raised in dark.
  pill: "#10251e",
};

type Palette = Record<keyof typeof light, string>;

// Must match the @media (prefers-color-scheme: dark) block in global.css.
const dark: Palette = {
  background: "#0e1411",
  surface: "#161d19",
  surfaceMuted: "#1d2621",
  border: "#2a342e",
  placeholder: "#232c27",
  foreground: "#e7ece6",
  heading: "#f3f6f1",
  muted: "#9aa59c",
  subtle: "#4b564e",
  primary: "#1f8f67",
  personalized: "#14251c",
  accent: "#e4a53a",
  accentSoft: "#3a2e14",
  inverse: "#ffffff",
  rating: "#3cc08f",
  favorite: "#ff5c7c",
  success: "#3cc08f",
  danger: "#f26464",
  pill: "#34423a",
};

export const palettes = { light, dark };

// Reads the palette for the current system scheme at access time. For code
// outside React only — components must use `useColors()` below, or the React
// Compiler's memoized output keeps the old scheme's colors after a switch.
export const colors: Palette = new Proxy(light, {
  get(_, key: keyof Palette) {
    return (Appearance.getColorScheme() === "dark" ? dark : light)[key];
  },
});

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
        offsetY: 5.5,
        blurRadius: 18,
        spreadDistance: 0,
        color: "rgba(31, 36, 31, 0.10)",
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

/**
 * The palette for the current scheme, as a hook. Use this in components rather
 * than `colors`: the React Compiler memoizes render output, and only a hook
 * value tells it to re-render when the system switches light/dark.
 */
export function useColors(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}
