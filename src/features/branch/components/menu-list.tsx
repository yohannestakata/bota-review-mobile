import { Fragment } from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { Menu } from "../api";
import { groupByCategory } from "../menu-format";
import { MenuItemRow } from "./menu-item-row";

// Renders one or more menus, each split into category sections. The menu name is
// only shown when a branch has more than one menu (avoids a redundant heading).
export function MenuList({ menus }: { menus: Menu[] }) {
  const showMenuNames = menus.length > 1;

  return (
    <View className="gap-6">
      {menus.map((menu) => (
        <View className="gap-1" key={menu.id}>
          {showMenuNames ? (
            <ThemedText className="mb-1" size="xl" weight="semibold">
              {menu.name}
            </ThemedText>
          ) : null}

          {groupByCategory(menu.items).map((group) => (
            <View className="mb-2" key={`${menu.id}-${group.category}`}>
              <ThemedText
                className="mb-0.5 uppercase tracking-wide"
                size="xs"
                tone="muted"
                weight="semibold"
              >
                {group.category}
              </ThemedText>
              {group.items.map((item, index) => (
                <Fragment key={item.id}>
                  {index > 0 ? <View className="h-px bg-border" /> : null}
                  <MenuItemRow item={item} />
                </Fragment>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
