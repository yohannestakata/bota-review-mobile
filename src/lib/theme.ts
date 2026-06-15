// Design tokens for JS color props (HugeIcons `color`, inline styles, etc.)
// that can't read CSS variables. Keep in sync with the --color-* vars in
// global.css and the Tailwind color tokens in tailwind.config.js.
export const colors = {
  background: "#f5f3ef",
  surface: "#ffffff",
  border: "#f5f5f5",
  placeholder: "#e5e5e5",
  foreground: "#171717",
  muted: "#737373",
  subtle: "#d4d4d4",
  primary: "#000000",
  inverse: "#ffffff",
  rating: "#f59e0b",
  favorite: "#e11d48",
  success: "#16a34a",
  danger: "#dc2626",
} as const;

export type ColorToken = keyof typeof colors;
