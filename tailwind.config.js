/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-muted": "var(--color-surface-muted)",
        border: "var(--color-border)",
        placeholder: "var(--color-placeholder)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        subtle: "var(--color-subtle)",
        primary: "var(--color-primary)",
        inverse: "var(--color-inverse)",
        rating: "var(--color-rating)",
        favorite: "var(--color-favorite)",
        success: "var(--color-success)",
        "success-soft": "var(--color-success-soft)",
        warning: "var(--color-warning)",
        "warning-soft": "var(--color-warning-soft)",
        danger: "var(--color-danger)",
        "danger-soft": "var(--color-danger-soft)",
      },
      fontFamily: {
        sans: ["Outfit-Regular"],
        outfit: ["Outfit-Regular"],
        "outfit-thin": ["Outfit-Thin"],
        "outfit-extralight": ["Outfit-ExtraLight"],
        "outfit-light": ["Outfit-Light"],
        "outfit-medium": ["Outfit-Medium"],
        "outfit-semibold": ["Outfit-SemiBold"],
        "outfit-bold": ["Outfit-Bold"],
        "outfit-extrabold": ["Outfit-ExtraBold"],
        "outfit-black": ["Outfit-Black"],
      },
      fontSize: {
        "5xl": [
          "var(--font-size-5xl)",
          {
            lineHeight: "var(--line-height-5xl)",
            letterSpacing: "var(--letter-spacing-5xl)",
          },
        ],
        "4xl": [
          "var(--font-size-4xl)",
          {
            lineHeight: "var(--line-height-4xl)",
            letterSpacing: "var(--letter-spacing-4xl)",
          },
        ],
        "3xl": [
          "var(--font-size-3xl)",
          {
            lineHeight: "var(--line-height-3xl)",
            letterSpacing: "var(--letter-spacing-3xl)",
          },
        ],
        "2xl": [
          "var(--font-size-2xl)",
          {
            lineHeight: "var(--line-height-2xl)",
            letterSpacing: "var(--letter-spacing-2xl)",
          },
        ],
        xl: [
          "var(--font-size-xl)",
          {
            lineHeight: "var(--line-height-xl)",
            letterSpacing: "var(--letter-spacing-xl)",
          },
        ],
        lg: [
          "var(--font-size-lg)",
          {
            lineHeight: "var(--line-height-lg)",
            letterSpacing: "var(--letter-spacing-lg)",
          },
        ],
        md: [
          "var(--font-size-md)",
          {
            lineHeight: "var(--line-height-md)",
            letterSpacing: "var(--letter-spacing-md)",
          },
        ],
        sm: [
          "var(--font-size-sm)",
          {
            lineHeight: "var(--line-height-sm)",
            letterSpacing: "var(--letter-spacing-sm)",
          },
        ],
        xs: [
          "var(--font-size-xs)",
          {
            lineHeight: "var(--line-height-xs)",
            letterSpacing: "var(--letter-spacing-xs)",
          },
        ],
      },
    },
  },
  plugins: [],
};
