import type { Menu, MenuItem } from "./api";

// Prices are stored as numeric strings (e.g. "320.00"). Addis menus quote whole
// birr, so round and suffix with "Br".
export function formatBirr(price: string): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return price;
  return `${Math.round(value)} Br`;
}

export type MenuCategory = { category: string; items: MenuItem[] };

// Groups a menu's items by category, preserving first-seen order.
export function groupByCategory(items: MenuItem[]): MenuCategory[] {
  const groups: MenuCategory[] = [];
  const byKey = new Map<string, MenuCategory>();

  for (const item of items) {
    const key = item.category ?? "Other";
    let group = byKey.get(key);
    if (!group) {
      group = { category: key, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}

export function totalItemCount(menus: Menu[]): number {
  return menus.reduce((sum, menu) => sum + menu.items.length, 0);
}

// Cheapest item across all menus, for a "from X Br" teaser.
export function lowestPrice(menus: Menu[]): string | null {
  let min = Infinity;
  for (const menu of menus) {
    for (const item of menu.items) {
      const value = Number(item.price);
      if (Number.isFinite(value) && value < min) min = value;
    }
  }
  return min === Infinity ? null : formatBirr(String(min));
}
