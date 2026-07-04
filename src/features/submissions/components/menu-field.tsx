import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

import type { SubmissionMenuItem } from "../api";

type Item = { id: string; name: string; price: string };

// Structured items for the submission (only rows with a name).
function toItems(items: Item[]): SubmissionMenuItem[] {
  return items
    .filter((item) => item.name.trim())
    .map((item) => {
      const price = item.price.trim();
      return price
        ? { name: item.name.trim(), price: Number(price) }
        : { name: item.name.trim() };
    });
}

// Structured "menu or prices" editor: rows of item name + price you can add and
// remove. Emits SubmissionMenuItem[].
export function MenuField({
  value,
  onChange,
}: {
  value: SubmissionMenuItem[];
  onChange: (value: SubmissionMenuItem[]) => void;
}) {
  const idRef = useRef(1);
  const makeItem = (): Item => ({
    id: String(idRef.current++),
    name: "",
    price: "",
  });
  const [items, setItems] = useState<Item[]>(() => [makeItem()]);

  // Reset when the form clears the field (e.g. after submit).
  useEffect(() => {
    if (value.length === 0) setItems([makeItem()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function apply(next: Item[]) {
    setItems(next);
    onChange(toItems(next));
  }

  function setItem(id: string, patch: Partial<Item>) {
    apply(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    apply(next.length ? next : [makeItem()]);
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        Menu or prices
      </ThemedText>

      <View className="gap-2">
        {items.map((item) => (
          <View className="flex-row items-center gap-2" key={item.id}>
            <TextField
              className="flex-1"
              onChangeText={(name) => setItem(item.id, { name })}
              placeholder="Item, e.g. Macchiato"
              surface="muted"
              value={item.name}
            />
            <TextField
              className="w-28"
              keyboardType="number-pad"
              onChangeText={(price) =>
                setItem(item.id, { price: price.replace(/\D/g, "") })
              }
              placeholder="0"
              suffix={
                <ThemedText size="sm" tone="muted">
                  Br
                </ThemedText>
              }
              surface="muted"
              value={item.price}
            />
            {items.length > 1 ? (
              <Pressable hitSlop={6} onPress={() => removeItem(item.id)}>
                <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <Pressable
        className="flex-row items-center gap-1.5 self-start"
        hitSlop={6}
        onPress={() => apply([...items, makeItem()])}
      >
        <AppIcon color={colors.foreground} icon={Add01Icon} size={16} />
        <ThemedText size="sm" weight="medium">
          Add item
        </ThemedText>
      </Pressable>
    </View>
  );
}
