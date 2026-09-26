import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { useQuery } from "@tanstack/react-query";
import { useColorScheme } from "react-native";

// Gebeta only publishes a light style, so dark mode derives one from it at
// runtime: fetch the style JSON once, then remap every paint color.

export const GEBETA_API_KEY = process.env.EXPO_PUBLIC_GEBETA_API_KEY ?? "";

// Gebeta's public style; its tile/glyph/sprite sources all live on this host.
export const GEBETA_STYLE_URL =
  "https://tiles.gebeta.app/styles/standard/style.json?device=mobile";

type Hsla = { h: number; s: number; l: number; a: number };
type Role = "fill" | "line" | "text" | "halo";

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
};

function rgbToHsl(r: number, g: number, b: number, a: number): Hsla {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l, a };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return { h, s, l, a };
}

function parseColor(input: string): Hsla | null {
  const value = NAMED[input] ?? input.trim();
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = [...hex].map((c) => c + c).join("");
    }
    if (hex.length !== 6 && hex.length !== 8) return null;
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    return rgbToHsl(n(0), n(2), n(4), hex.length === 8 ? n(6) / 255 : 1);
  }
  const match = value.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!match) return null;
  const parts = match[2].split(",").map((p) => parseFloat(p));
  if (parts.some(Number.isNaN) || parts.length < 3) return null;
  const a = parts[3] ?? 1;
  if (match[1].startsWith("rgb")) {
    return rgbToHsl(parts[0], parts[1], parts[2], a);
  }
  return { h: parts[0], s: parts[1] / 100, l: parts[2] / 100, a };
}

// Areas (land, water, parks, buildings) keep their light-mode order but are
// compressed into a narrow dark band near the app's background. Lines (roads,
// paths, borders) sit in a lighter band so streets read as lighter than the
// land, the way dark maps usually draw them. Labels invert to light text on
// dark halos. Saturation is pulled down so tints stay hints, not neon.
function darken({ h, s, l, a }: Hsla, role: Role): Hsla {
  switch (role) {
    case "text":
      return { h, s: s * 0.7, l: 0.35 + (1 - l) * 0.55, a };
    case "halo":
      return { h, s: s * 0.3, l: 0.09, a };
    case "line":
      return { h, s: s * 0.4, l: 0.1 + 0.25 * l, a };
    case "fill":
      return { h, s: s * 0.35, l: 0.06 + 0.1 * l ** 3, a };
  }
}

function format({ h, s, l, a }: Hsla) {
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  return `hsla(${Math.round(h)}, ${pct(s)}, ${pct(l)}, ${a})`;
}

// Recolors every color string inside a paint value, including those nested in
// expressions and zoom stops; everything else passes through untouched.
function remap(value: unknown, role: Role): unknown {
  if (typeof value === "string") {
    const parsed = parseColor(value);
    return parsed ? format(darken(parsed, role)) : value;
  }
  if (Array.isArray(value)) return value.map((v) => remap(v, role));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, remap(v, role)]),
    );
  }
  return value;
}

type StyleJson = {
  layers: { paint?: Record<string, unknown> }[];
  [key: string]: unknown;
};

export function darkenStyle(style: StyleJson): StyleJson {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!layer.paint) return layer;
      const paint = Object.fromEntries(
        Object.entries(layer.paint).map(([key, value]) => {
          if (!key.endsWith("-color")) return [key, value];
          const role: Role =
            key === "text-halo-color"
              ? "halo"
              : key === "text-color"
                ? "text"
                : key === "line-color"
                  ? "line"
                  : "fill";
          return [key, remap(value, role)];
        }),
      );
      return { ...layer, paint };
    }),
  };
}

/**
 * The map style for the current scheme: Gebeta's URL in light mode, a darkened
 * copy of it in dark mode (fetched once and cached for the session). While the
 * dark copy loads, returns null so the map doesn't flash light first.
 */
export function useMapStyle(): string | StyleSpecification | null {
  const dark = useColorScheme() === "dark";
  const darkStyle = useQuery({
    queryKey: ["gebeta-style", "dark"],
    queryFn: async () => {
      const res = await fetch(GEBETA_STYLE_URL, {
        headers: { Authorization: `Bearer ${GEBETA_API_KEY}` },
      });
      if (!res.ok) throw new Error(`Map style ${res.status}`);
      return darkenStyle(
        (await res.json()) as StyleJson,
      ) as unknown as StyleSpecification;
    },
    enabled: dark && Boolean(GEBETA_API_KEY),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!dark) return GEBETA_STYLE_URL;
  // If the fetch fails, fall back to the light map rather than none.
  if (darkStyle.isError) return GEBETA_STYLE_URL;
  return darkStyle.data ?? null;
}
