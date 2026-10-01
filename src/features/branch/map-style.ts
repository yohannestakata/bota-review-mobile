import {
  TransformRequestManager,
  type StyleSpecification,
} from "@maplibre/maplibre-react-native";
import { useQuery } from "@tanstack/react-query";
import { LogBox, useColorScheme } from "react-native";

// Gebeta publishes one light style. We fetch its JSON once and tidy it before
// use: hide the base map's own restaurant/cafe icons (ours are the tappable
// places), repair colors MapLibre rejects, and for dark mode derive a dark
// version by remapping every paint color.

export const GEBETA_API_KEY = process.env.EXPO_PUBLIC_GEBETA_API_KEY ?? "";

// Gebeta's public style; its tile/glyph/sprite sources all live on this host.
export const GEBETA_STYLE_URL =
  "https://tiles.gebeta.app/styles/standard/style.json?device=mobile";

// Shared setup for every map (place page, search), registered once when this
// module loads — any map component imports it for the style.
//
// Gebeta's tile server authenticates via an `Authorization: Bearer` header and
// rejects any `?apiKey=` query param, so attach the header to every request to
// the Gebeta host.
if (GEBETA_API_KEY) {
  TransformRequestManager.addHeader({
    name: "Authorization",
    value: `Bearer ${GEBETA_API_KEY}`,
    match: "tiles\\.gebeta\\.app",
  });
}

// Gebeta answers HTTP 500 (instead of an empty 204) whenever MapLibre asks for
// a zoom outside a layer's declared range (e.g. `buildings` below z15, the
// other layers above z14). The map still renders correctly; MapLibre just logs
// each miss as an error, which floods dev with red boxes. Silence only those
// lines — dev-only, a no-op in release builds.
LogBox.ignoreLogs([
  /tiles\.gebeta\.app/,
  /Failed to load tile .* HTTP status code 500/,
]);

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
  layers: {
    id: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
  }[];
  [key: string]: unknown;
};

// The base map's food and drink icons: they look tappable but aren't ours.
const HIDDEN_LAYERS = new Set(["poi-restaurant", "poi-fast-food", "poi-cafe"]);

// `rgba()` with only three channels is invalid to MapLibre (it logs "value
// must be a valid color" and skips the paint); give it an alpha.
function repairColors(value: unknown): unknown {
  if (typeof value === "string") {
    const m = value.match(/^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,)]+)\s*\)$/);
    return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, 1)` : value;
  }
  if (Array.isArray(value)) return value.map(repairColors);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, repairColors(v)]),
    );
  }
  return value;
}

export function tidyStyle(style: StyleJson): StyleJson {
  return {
    ...style,
    layers: style.layers.map((layer) => ({
      ...layer,
      ...(layer.paint
        ? { paint: repairColors(layer.paint) as Record<string, unknown> }
        : {}),
      ...(HIDDEN_LAYERS.has(layer.id)
        ? { layout: { ...layer.layout, visibility: "none" } }
        : {}),
    })),
  };
}

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
 * The tidied map style for the current scheme (light, or a darkened copy),
 * fetched once and kept with the persisted cache. Returns null while it first
 * loads so the map doesn't flash an untidied or light version.
 */
export function useMapStyle(): string | StyleSpecification | null {
  const dark = useColorScheme() === "dark";
  const style = useQuery({
    queryKey: ["gebeta-style", "v2", dark ? "dark" : "light"],
    queryFn: async () => {
      const res = await fetch(GEBETA_STYLE_URL, {
        headers: { Authorization: `Bearer ${GEBETA_API_KEY}` },
      });
      if (!res.ok) throw new Error(`Map style ${res.status}`);
      const tidy = tidyStyle((await res.json()) as StyleJson);
      return (dark ? darkenStyle(tidy) : tidy) as unknown as StyleSpecification;
    },
    enabled: Boolean(GEBETA_API_KEY),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: Infinity,
  });

  // If the fetch fails, fall back to Gebeta's own style rather than none.
  if (style.isError) return GEBETA_STYLE_URL;
  return style.data ?? null;
}
