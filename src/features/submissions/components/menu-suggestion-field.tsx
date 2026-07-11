import { useState } from "react";
import { View } from "react-native";

import { ChipButton } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import type { Menu, MenuItem } from "@/features/branch/api";

import type { SubmissionMenuChange, SubmissionMenuItem } from "../api";
import { MenuField } from "./menu-field";

type Mode = "add" | "update" | "remove";

function editableItem(item: MenuItem): SubmissionMenuItem {
  return {
    name: item.name,
    price: Number(item.price),
    ...(item.category ? { category: item.category } : {}),
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.cloudinaryPublicId ? { publicId: item.cloudinaryPublicId } : {}),
  };
}

export function MenuSuggestionField({
  menus,
  onChange,
}: {
  menus: Menu[];
  onChange: (changes: SubmissionMenuChange[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("add");
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [addDraft, setAddDraft] = useState<SubmissionMenuItem[]>([]);
  const items = menus.flatMap((menu) => menu.items);

  function chooseMode(next: Mode) {
    setMode(next);
    setSelected(null);
    setAddDraft([]);
    onChange([]);
  }

  function chooseItem(item: MenuItem) {
    setSelected(item);
    if (mode === "remove") {
      onChange([{ operation: "remove", itemId: item.id, itemName: item.name }]);
    }
  }

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        <ChipButton
          label="Add items"
          onPress={() => chooseMode("add")}
          selected={mode === "add"}
        />
        <ChipButton
          label="Edit an item"
          onPress={() => chooseMode("update")}
          selected={mode === "update"}
        />
        <ChipButton
          label="Remove an item"
          onPress={() => chooseMode("remove")}
          selected={mode === "remove"}
        />
      </View>

      {mode === "add" ? (
        <MenuField
          label="Items to add"
          onChange={(next) => {
            setAddDraft(next);
            onChange(next.map((item) => ({ operation: "add", item })));
          }}
          value={addDraft}
        />
      ) : items.length === 0 ? (
        <ThemedText size="sm" tone="muted">
          There are no current menu items to{" "}
          {mode === "update" ? "edit" : "remove"}.
        </ThemedText>
      ) : (
        <View className="gap-3">
          <ThemedText size="sm" weight="medium">
            Choose an item
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {items.map((item) => (
              <ChipButton
                key={item.id}
                label={item.name}
                onPress={() => chooseItem(item)}
                selected={selected?.id === item.id}
              />
            ))}
          </View>

          {mode === "update" && selected ? (
            <MenuField
              key={selected.id}
              label="Updated item"
              onChange={(next) =>
                onChange(
                  next[0]
                    ? [
                        {
                          operation: "update",
                          itemId: selected.id,
                          item: next[0],
                        },
                      ]
                    : [],
                )
              }
              singleItem
              value={[editableItem(selected)]}
            />
          ) : null}

          {mode === "remove" && selected ? (
            <ThemedText size="sm" tone="muted">
              Only {selected.name} will be removed.
            </ThemedText>
          ) : null}
        </View>
      )}
    </View>
  );
}
