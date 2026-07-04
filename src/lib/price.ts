export type MenuPriceRange = {
  min: string;
  max: string;
};

export function formatBirrPrice(price: string | number): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return String(price);
  return `${Math.round(value)} Br`;
}

export function formatMenuPriceRange(
  range?: MenuPriceRange | null,
): string | null {
  if (!range) return null;

  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  if (Math.round(min) === Math.round(max)) {
    return formatBirrPrice(min);
  }

  return `${Math.round(min)}-${Math.round(max)} Br`;
}
